import { logger } from '../../utils/logger.js'
import type { getDb } from './database.js'

type SqliteDb = ReturnType<typeof getDb>

const LEGACY_COLUMNS = {
  categories: {
    icon: "TEXT DEFAULT ''",
    level: 'INTEGER DEFAULT 0',
    sort_order: 'INTEGER DEFAULT 0',
    parent_id: 'INTEGER DEFAULT NULL'
  },
  items: {
    description: "TEXT DEFAULT ''",
    icon: "TEXT DEFAULT ''",
    category_id: 'INTEGER',
    pinned: 'INTEGER DEFAULT 0',
    level: 'INTEGER DEFAULT 0',
    click_count: 'INTEGER DEFAULT 0',
    last_visited: 'TEXT',
    sort_order: 'INTEGER DEFAULT 0'
  },
  users: {
    level: 'INTEGER DEFAULT 0',
    auth_version: 'INTEGER DEFAULT 0',
    created_at: 'TEXT',
    last_login: 'TEXT'
  },
  settings: {
    value: 'TEXT'
  },
  audit_logs: {
    details: 'TEXT',
    ip: 'TEXT',
    created_at: 'TEXT'
  },
  sessions: {
    ip: 'TEXT',
    user_agent: 'TEXT',
    created_at: 'TEXT',
    last_active_at: 'TEXT',
    expires_at: 'TEXT'
  },
  daily_stats: {
    pv: 'INTEGER DEFAULT 0',
    uv: 'INTEGER DEFAULT 0'
  },
  visit_logs: {
    os: 'TEXT',
    browser: 'TEXT',
    referrer: 'TEXT',
    created_at: 'TEXT'
  }
}

const getExistingColumns = (db: SqliteDb, table: string) =>
  new Set(
    db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((column: { name?: string }) => column.name as string)
  )

const ensureColumns = (db: SqliteDb, table: string, columns: Record<string, string>) => {
  const existingColumns = getExistingColumns(db, table)

  Object.entries(columns).forEach(([column, definition]) => {
    if (existingColumns.has(column)) {
      return
    }

    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    existingColumns.add(column)
    logger.info(`数据库迁移: 已添加 ${table}.${column} 字段`)
  })
}

export const databaseSchemaService = {
  initSchema(db: SqliteDb) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT DEFAULT '',
            level INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0
        )
    `)

    db.exec(`
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL UNIQUE,
            description TEXT DEFAULT '',
            icon TEXT DEFAULT '',
            category_id INTEGER,
            pinned INTEGER DEFAULT 0,
            level INTEGER DEFAULT 0,
            click_count INTEGER DEFAULT 0,
            last_visited TEXT,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
    `)

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            level INTEGER DEFAULT 0,
            auth_version INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            last_login TEXT
        )
    `)

    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `)

    db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `)

    logger.info('数据库 Schema 初始化完成')

    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            last_active_at TEXT DEFAULT (datetime('now')),
            expires_at TEXT
        )
    `)

    db.exec(`
        CREATE TABLE IF NOT EXISTS daily_stats (
            date TEXT PRIMARY KEY,
            pv INTEGER DEFAULT 0,
            uv INTEGER DEFAULT 0
        )
    `)

    db.exec(`
        CREATE TABLE IF NOT EXISTS visit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            ip TEXT NOT NULL,
            os TEXT,
            browser TEXT,
            referrer TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(date, ip)
        )
    `)

    db.exec(`
        DROP INDEX IF EXISTS idx_recycle_deleted;
        DROP TABLE IF EXISTS recycle_bin;
    `)

    Object.entries(LEGACY_COLUMNS).forEach(([table, columns]) => {
      ensureColumns(db, table, columns)
    })

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_items_url ON items(url);
        CREATE INDEX IF NOT EXISTS idx_items_name ON items(name COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
        CREATE INDEX IF NOT EXISTS idx_audit_username ON audit_logs(username);
        CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
        CREATE INDEX IF NOT EXISTS idx_items_level ON items(level);
        CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_visit_logs_date ON visit_logs(date);
        CREATE INDEX IF NOT EXISTS idx_items_category_level ON items(category_id, level);
        CREATE INDEX IF NOT EXISTS idx_items_category_sort ON items(category_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_categories_parent_sort ON categories(parent_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_items_clicks_desc ON items(click_count DESC);
        CREATE INDEX IF NOT EXISTS idx_items_last_visited ON items(last_visited DESC);
        CREATE INDEX IF NOT EXISTS idx_items_name_lower ON items(LOWER(name));
        CREATE INDEX IF NOT EXISTS idx_items_desc_lower ON items(LOWER(description));
    `)

    logger.info('数据库 Schema 初始化完成')
  }
}
