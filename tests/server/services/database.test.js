// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import { getDb, backupDatabase } from '../../../src/server/services/database/database.js'
import { queryMonitor } from '../../../src/server/utils/queryMonitor.js'
import { resetTestDatabase } from '../../setup/testHelpers.js'

describe('Database Service 备份功能测试', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test'
    resetTestDatabase()
  })

  afterEach(() => {
    // 清理备份文件
    const db = getDb()
    const dbPath = db.name
    const backupPath = dbPath + '.bak'
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath)
    }
  })

  it('backupDatabase 应该返回成功对象并生成备份文件', () => {
    const result = backupDatabase()

    // 验证返回格式
    expect(result).toBeTypeOf('object')
    expect(result.success).toBe(true)
    expect(result.path).toBeDefined()
    expect(result.path).toContain('.db.bak')

    // 验证文件是否真实存在
    expect(fs.existsSync(result.path)).toBe(true)
  })

  it('在执行备份前应该能正常进行数据库操作', () => {
    const db = getDb()
    db.prepare('INSERT INTO categories (name) VALUES (?)').run('测试分类')

    const result = backupDatabase()
    expect(result.success).toBe(true)
    expect(fs.existsSync(result.path)).toBe(true)
  })

  it('wires query monitor so prepared statements are observable', () => {
    queryMonitor.reset()

    const db = getDb()
    db.prepare('SELECT COUNT(*) as count FROM categories').get()

    const stats = queryMonitor.getStats()
    expect(stats['SELECT COUNT(*) as count FROM categories']?.count).toBeGreaterThanOrEqual(1)
  })
})
