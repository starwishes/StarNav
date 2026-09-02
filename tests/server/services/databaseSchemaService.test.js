// @vitest-environment node
import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: {
    info: vi.fn()
  }
}))

const { logger } = await import('../../../src/server/utils/logger.js')
const { databaseSchemaService } =
  await import('../../../src/server/services/database/databaseSchemaService.js')

describe('DatabaseSchemaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes core tables and backfills legacy columns before creating indexes', () => {
    const db = new Database(':memory:')

    db.exec(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );
      CREATE TABLE items (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE
      );
      CREATE TABLE users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL
      );
      CREATE TABLE settings (
        key TEXT PRIMARY KEY
      );
      CREATE TABLE recycle_bin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        action TEXT NOT NULL
      );
      CREATE TABLE sessions (
        session_id TEXT PRIMARY KEY,
        username TEXT NOT NULL
      );
    `)

    databaseSchemaService.initSchema(db)

    const getColumnNames = (table) =>
      db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .map((column) => column.name)
    const getIndexNames = (table) =>
      db
        .prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ?`)
        .all(table)
        .map((row) => row.name)

    expect(getColumnNames('categories')).toEqual(
      expect.arrayContaining(['icon', 'level', 'sort_order', 'parent_id'])
    )
    expect(getColumnNames('items')).toEqual(
      expect.arrayContaining([
        'description',
        'icon',
        'category_id',
        'pinned',
        'level',
        'click_count',
        'last_visited',
        'sort_order'
      ])
    )
    expect(getColumnNames('users')).toEqual(
      expect.arrayContaining(['level', 'created_at', 'last_login'])
    )
    expect(getColumnNames('audit_logs')).toEqual(
      expect.arrayContaining(['details', 'ip', 'created_at'])
    )
    expect(getColumnNames('sessions')).toEqual(
      expect.arrayContaining(['ip', 'user_agent', 'created_at', 'last_active_at', 'expires_at'])
    )
    expect(
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'recycle_bin'")
        .get()
    ).toBeUndefined()
    expect(getIndexNames('sessions')).toEqual(
      expect.arrayContaining(['idx_sessions_expires', 'idx_sessions_username'])
    )

    expect(logger.info).toHaveBeenCalledWith('数据库迁移: 已添加 categories.parent_id 字段')
    expect(logger.info).toHaveBeenCalledWith('数据库迁移: 已添加 sessions.expires_at 字段')
    expect(logger.info).toHaveBeenCalledWith('数据库 Schema 初始化完成')

    db.close()
  })

  it('is idempotent when schema initialization runs more than once', () => {
    const db = new Database(':memory:')

    expect(() => databaseSchemaService.initSchema(db)).not.toThrow()
    expect(() => databaseSchemaService.initSchema(db)).not.toThrow()

    expect(logger.info).toHaveBeenCalledWith('数据库 Schema 初始化完成')

    db.close()
  })
})
