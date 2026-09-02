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
  /**
   * Schema 演进决策（第 15 轮审查评估）：
   * 目前不维护 PRAGMA user_version + 顺序迁移表，沿用 CREATE TABLE IF NOT EXISTS +
   * ALTER TABLE ADD COLUMN（ensureColumns，幂等）模式。这是有意的取舍：
   * - 现有变更全部是"老库补列/补索引"，ensureColumns 按列名幂等，无需版本号即可重复执行；
   * - 引入 user_version 的收益（显式版本门控、破坏性迁移编排）在当前增量演进下用不上。
   * 何时应改引入 user_version：出现需要区分"列已存在但语义不同"（如重命名/改类型，SQLite
   * 无法一步 ALTER）、或必须按版本顺序执行的数据迁移（如回填/去重脚本）时，再为 initSchema
   * 引入版本检查并在版本不符时执行有序迁移脚本。
   */
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
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
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
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
    `)

    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            last_active_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            expires_at TEXT
        )
    `)

    db.exec(`
        DROP INDEX IF EXISTS idx_recycle_deleted;
        DROP TABLE IF EXISTS recycle_bin;
    `)

    Object.entries(LEGACY_COLUMNS).forEach(([table, columns]) => {
      ensureColumns(db, table, columns)
    })

    // 索引清单（新库生效；老库已存在的索引不受影响——本服务不做 DROP INDEX 迁移，
    // 冗余索引在老库上会继续存在但无功能影响）。
    // 已确认删除的死/冗余索引：
    // - idx_items_category：被 idx_items_category_level / idx_items_category_sort 的
    //   category_id 前缀完全覆盖（等值查询两类复合索引均能命中）。
    // - idx_items_name(NOCASE) / idx_items_name_lower / idx_items_desc_lower：
    //   items 上没有 name/description 等值或前缀查询；搜索用 LOWER(x) LIKE '%…%'
    //   前导通配符，B-tree 索引用不上。
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
        CREATE INDEX IF NOT EXISTS idx_audit_username ON audit_logs(username);
        CREATE INDEX IF NOT EXISTS idx_items_level ON items(level);
        CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_items_category_level ON items(category_id, level);
        CREATE INDEX IF NOT EXISTS idx_items_category_sort ON items(category_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_categories_parent_sort ON categories(parent_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_items_clicks_desc ON items(click_count DESC);
        CREATE INDEX IF NOT EXISTS idx_items_last_visited ON items(last_visited DESC);
    `)

    logger.info('数据库 Schema 初始化完成')
  }
}
