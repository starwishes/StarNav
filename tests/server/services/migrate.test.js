// @vitest-environment node
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'

const loadMigrationModule = async () => {
  vi.resetModules()
  const migration = await import('../../../src/server/services/migrate.js')
  const database = await import('../../../src/server/services/database/database.js')
  return { ...migration, ...database }
}

describe('migrate service', () => {
  let testDataDir
  const originalAdminUsername = process.env.ADMIN_USERNAME

  beforeEach(() => {
    delete process.env.ADMIN_USERNAME
  })

  afterEach(async () => {
    await cleanupTestDataDir(testDataDir)
    process.env.ADMIN_USERNAME = originalAdminUsername
  })

  it('migrates root json bookmark data into sqlite and archives the source file', async () => {
    testDataDir = createTestDataDir('starnav-migrate-data')
    fs.writeFileSync(
      path.join(testDataDir, 'data.json'),
      JSON.stringify({
        categories: [{ id: '1', name: 'Docs', icon: 'icon-docs', level: 2 }],
        items: [
          {
            id: '2',
            name: 'Guide',
            url: 'https://guide.test',
            description: 'docs',
            icon: 'icon-guide',
            categoryId: '1',
            pinned: true,
            level: 1,
            clickCount: 5,
            lastVisited: '2026-04-13T10:00:00.000Z'
          }
        ]
      })
    )

    const { migrateFromJson, getDb } = await loadMigrationModule()

    expect(migrateFromJson()).toBe(true)

    const db = getDb()
    expect(db.prepare('SELECT id, name, icon, level FROM categories').all()).toEqual([
      { id: 1, name: 'Docs', icon: 'icon-docs', level: 2 }
    ])
    expect(
      db
        .prepare(
          'SELECT id, name, url, category_id AS categoryId, pinned, level, click_count AS clickCount FROM items'
        )
        .all()
    ).toEqual([
      {
        id: 2,
        name: 'Guide',
        url: 'https://guide.test',
        categoryId: 1,
        pinned: 1,
        level: 1,
        clickCount: 5
      }
    ])
    expect(fs.existsSync(path.join(testDataDir, 'data.json'))).toBe(false)
    expect(fs.existsSync(path.join(testDataDir, 'archive', 'data.json.migrated.bak'))).toBe(true)
  })

  it('skips bookmark migration when sqlite already has categories', async () => {
    testDataDir = createTestDataDir('starnav-migrate-skip')
    fs.writeFileSync(
      path.join(testDataDir, 'data.json'),
      JSON.stringify({ categories: [{ id: 1, name: 'Docs' }], items: [] })
    )

    const { migrateFromJson, getDb } = await loadMigrationModule()
    getDb()
      .prepare('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)')
      .run(9, 'Existing', 0)

    expect(migrateFromJson()).toBe(false)
    expect(fs.existsSync(path.join(testDataDir, 'data.json'))).toBe(true)
  })

  it('migrates user files with admin level inference and skips when users already exist', async () => {
    testDataDir = createTestDataDir('starnav-migrate-users')
    process.env.ADMIN_USERNAME = 'owner'
    fs.mkdirSync(path.join(testDataDir, 'users'), { recursive: true })
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'owner.json'),
      JSON.stringify({ password: '$2a$10$abcdefghijklmnopqrstuv' })
    )
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'alice.json'),
      JSON.stringify({ password: '$2b$10$abcdefghijklmnopqrstuv', level: 2 })
    )
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'bob.json'),
      JSON.stringify({ password: '$2y$10$abcdefghijklmnopqrstuv' })
    )

    const { migrateUsers, getDb } = await loadMigrationModule()

    expect(migrateUsers()).toEqual({
      inserted: 3,
      skipped: 0,
      failed: [],
      ran: true
    })
    expect(
      getDb().prepare('SELECT username, password, level FROM users ORDER BY username ASC').all()
    ).toEqual([
      { username: 'alice', password: '$2b$10$abcdefghijklmnopqrstuv', level: 2 },
      { username: 'bob', password: '$2y$10$abcdefghijklmnopqrstuv', level: 1 },
      { username: 'owner', password: '$2a$10$abcdefghijklmnopqrstuv', level: 3 }
    ])

    // 用户表已有数据：整体跳过（ran=false），不再尝试迁移
    expect(migrateUsers()).toEqual({ inserted: 0, skipped: 0, failed: [], ran: false })
  })

  it('clamps migrated user levels to [1,3] and falls back for non-numeric values', async () => {
    testDataDir = createTestDataDir('starnav-migrate-users-level-clamp')
    fs.mkdirSync(path.join(testDataDir, 'users'), { recursive: true })
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'high.json'),
      JSON.stringify({ password: '$2a$10$abcdefghijklmnopqrstuv', level: 99 })
    )
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'low.json'),
      JSON.stringify({ password: '$2a$10$abcdefghijklmnopqrstuv', level: -5 })
    )
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'guest.json'),
      JSON.stringify({ password: '$2a$10$abcdefghijklmnopqrstuv', level: 0 })
    )
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'garbage.json'),
      JSON.stringify({ password: '$2a$10$abcdefghijklmnopqrstuv', level: 'not-a-number' })
    )
    // 字符串数字仍在合法区间时保留（Number 归一后钳制不变）
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'ok.json'),
      JSON.stringify({ password: '$2a$10$abcdefghijklmnopqrstuv', level: '2' })
    )

    const { migrateUsers, getDb } = await loadMigrationModule()

    expect(migrateUsers().inserted).toBe(5)
    expect(
      getDb().prepare('SELECT username, level FROM users ORDER BY username ASC').all()
    ).toEqual([
      { username: 'garbage', level: 1 },
      { username: 'guest', level: 1 },
      { username: 'high', level: 3 },
      { username: 'low', level: 1 },
      { username: 'ok', level: 2 }
    ])
  })

  it('stores migrated user created_at in the ISO-8601 Z format shared with the schema default', async () => {
    testDataDir = createTestDataDir('starnav-migrate-users-created-at')
    fs.mkdirSync(path.join(testDataDir, 'users'), { recursive: true })
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'alice.json'),
      JSON.stringify({ password: '$2a$10$abcdefghijklmnopqrstuv' })
    )

    const { migrateUsers, getDb } = await loadMigrationModule()

    expect(migrateUsers().inserted).toBe(1)
    const createdAt = getDb().prepare('SELECT created_at FROM users').get().created_at
    expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('keeps successful users and reports per-file failures when one user JSON is corrupt', async () => {
    testDataDir = createTestDataDir('starnav-migrate-users-corrupt')
    fs.mkdirSync(path.join(testDataDir, 'users'), { recursive: true })
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'alice.json'),
      JSON.stringify({ password: '$2a$10$abcdefghijklmnopqrstuv', level: 2 })
    )
    fs.writeFileSync(path.join(testDataDir, 'users', 'corrupt.json'), '{not valid json')
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'bob.json'),
      JSON.stringify({ password: '$2b$10$abcdefghijklmnopqrstuv' })
    )

    const { migrateUsers, getDb } = await loadMigrationModule()

    expect(migrateUsers()).toEqual({
      inserted: 2,
      skipped: 0,
      failed: ['corrupt.json'],
      ran: true
    })
    // 损坏文件未中断整批迁移：alice/bob 已入库，corrupt 不在库中
    expect(getDb().prepare('SELECT username FROM users ORDER BY username ASC').all()).toEqual([
      { username: 'alice' },
      { username: 'bob' }
    ])
  })

  it('skips users whose stored password is plaintext instead of a bcrypt hash', async () => {
    testDataDir = createTestDataDir('starnav-migrate-plaintext')
    fs.mkdirSync(path.join(testDataDir, 'users'), { recursive: true })
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'admin.json'),
      JSON.stringify({ password: 'plaintext-secret' })
    )
    fs.writeFileSync(
      path.join(testDataDir, 'users', 'alice.json'),
      JSON.stringify({ password: '$2a$10$abcdefghijklmnopqrstuv', level: 2 })
    )

    const { migrateUsers, getDb } = await loadMigrationModule()

    expect(migrateUsers()).toEqual({
      inserted: 1,
      skipped: 1,
      failed: [],
      ran: true
    })
    expect(getDb().prepare('SELECT username, password, level FROM users').all()).toEqual([
      { username: 'alice', password: '$2a$10$abcdefghijklmnopqrstuv', level: 2 }
    ])
  })

  it('re-parents dangling category references to uncategorized during migration', async () => {
    testDataDir = createTestDataDir('starnav-migrate-dangling')
    fs.writeFileSync(
      path.join(testDataDir, 'data.json'),
      JSON.stringify({
        categories: [{ id: '1', name: 'Docs' }],
        items: [
          { id: '2', name: 'Guide', url: 'https://guide.test', categoryId: '1' },
          { id: '3', name: 'Orphan', url: 'https://orphan.test', categoryId: '999' }
        ]
      })
    )

    const { migrateFromJson, getDb } = await loadMigrationModule()

    expect(migrateFromJson()).toBe(true)
    const rows = getDb()
      .prepare('SELECT id, category_id AS categoryId FROM items ORDER BY id ASC')
      .all()
    expect(rows).toEqual([
      { id: 2, categoryId: 1 },
      { id: 3, categoryId: null }
    ])
  })

  it('migrates settings into sqlite and archives the source file', async () => {
    testDataDir = createTestDataDir('starnav-migrate-settings')
    fs.writeFileSync(
      path.join(testDataDir, 'settings.json'),
      JSON.stringify({
        registrationEnabled: true,
        siteName: 'StarNav'
      })
    )

    const { migrateSettings, getDb } = await loadMigrationModule()

    expect(migrateSettings()).toBe(true)
    expect(getDb().prepare('SELECT key, value FROM settings ORDER BY key ASC').all()).toEqual([
      { key: 'registrationEnabled', value: 'true' },
      { key: 'siteName', value: '"StarNav"' }
    ])
    expect(fs.existsSync(path.join(testDataDir, 'settings.json'))).toBe(false)
    expect(fs.existsSync(path.join(testDataDir, 'settings.json.migrated.bak'))).toBe(true)
  })

  it('warns about duplicate urls/ids in legacy json instead of silently replacing rows', async () => {
    testDataDir = createTestDataDir('starnav-migrate-duplicates')
    fs.writeFileSync(
      path.join(testDataDir, 'data.json'),
      JSON.stringify({
        categories: [{ id: 1, name: 'Docs' }],
        items: [
          { id: 10, name: 'First', url: 'https://dup.test' },
          { id: 11, name: 'Second', url: 'https://dup.test' }
        ]
      })
    )

    const { migrateFromJson, getDb } = await loadMigrationModule()
    const { logger } = await import('../../../src/server/utils/logger.js')
    const warnSpy = vi.spyOn(logger, 'warn')

    expect(migrateFromJson()).toBe(true)
    // 重复 url 触发 REPLACE：仅最后一条保留，但迁移前有可观测的告警
    expect(getDb().prepare('SELECT COUNT(*) AS count FROM items').get().count).toBe(1)
    expect(getDb().prepare('SELECT name FROM items').get().name).toBe('Second')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('重复 url'))

    warnSpy.mockRestore()
  })
})
