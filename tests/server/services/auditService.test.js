// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { auditService } from '../../../src/server/services/identity/auditService.js'
import { getDb } from '../../../src/server/services/database/database.js'
import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'

describe('auditService', () => {
  let testDataDir

  beforeEach(() => {
    testDataDir = createTestDataDir('starnav-audit-service')
    getDb().prepare('DELETE FROM audit_logs').run()
  })

  afterEach(async () => {
    await cleanupTestDataDir(testDataDir)
  })

  it('writes audit entries with normalized detail metadata', () => {
    auditService.log('login', {
      username: 'alice',
      ip: '1.1.1.1',
      userAgent: 'Vitest Browser',
      success: false,
      details: 'bad password'
    })
    auditService.log('logout')

    const rows = getDb()
      .prepare('SELECT username, action, details, ip FROM audit_logs ORDER BY id ASC')
      .all()

    expect(rows).toHaveLength(2)
    expect(rows[0].username).toBe('alice')
    expect(rows[0].action).toBe('login')
    expect(rows[0].ip).toBe('1.1.1.1')
    expect(JSON.parse(rows[0].details)).toEqual({
      success: false,
      userAgent: 'Vitest Browser',
      message: 'bad password'
    })
    expect(JSON.parse(rows[1].details)).toEqual({
      success: true,
      userAgent: 'unknown',
      message: ''
    })
  })

  it('paginates log reads in descending timestamp order', () => {
    const insert = getDb().prepare(
      'INSERT INTO audit_logs (username, action, details, ip, created_at) VALUES (?, ?, ?, ?, ?)'
    )

    insert.run('alice', 'older', '{}', '1.1.1.1', '2026-04-13 10:00:01')
    insert.run('bob', 'middle', '{}', '1.1.1.2', '2026-04-13 10:00:02')
    insert.run('carol', 'latest', '{}', '1.1.1.3', '2026-04-13 10:00:03')

    const page = auditService.getLogs(2, 1)

    expect(page.total).toBe(3)
    expect(page.logs).toEqual([
      expect.objectContaining({
        username: 'bob',
        action: 'middle',
        ip: '1.1.1.2',
        timestamp: '2026-04-13 10:00:02'
      })
    ])
  })

  it('orders mixed space-form and T-form rows by real time, not string order', () => {
    const db = getDb()
    const insert = db.prepare(
      'INSERT INTO audit_logs (username, action, details, ip, created_at) VALUES (?, ?, ?, ?, ?)'
    )

    // 同日混存两种格式时，字符串倒序恒把 T 形（'T' > ' '）排前面：space-noon 真实更晚
    // 却被排在 t-morning 之后。数值比较必须按真实时间倒序返回 space-noon 在前。
    insert.run('t-morning', 'older', '{}', '1.1.1.1', '2026-04-13T09:00:00.000Z')
    insert.run('space-noon', 'newer', '{}', '1.1.1.2', '2026-04-13 12:00:00')
    insert.run('next-day', 'latest', '{}', '1.1.1.3', '2026-04-14T00:00:00.000Z')

    const page = auditService.getLogs(1, 10)

    expect(page.logs.map((row) => row.username)).toEqual(['next-day', 'space-noon', 't-morning'])
  })

  it('orders same-second rows by descending id for stable pagination', () => {
    const db = getDb()
    const insert = db.prepare(
      'INSERT INTO audit_logs (username, action, details, ip, created_at) VALUES (?, ?, ?, ?, ?)'
    )

    // 三行同秒（跨格式同日混存也属同秒）：strftime('%s') 相等时须按 id 倒序（后写入者在前），
    // 否则同秒行次序随 SQLite 扫描顺序漂移，翻页会出现重复/遗漏
    insert.run('first', 'older', '{}', '1.1.1.1', '2026-04-13 10:00:00')
    insert.run('second', 'older', '{}', '1.1.1.1', '2026-04-13T10:00:00.000Z')
    insert.run('third', 'newer', '{}', '1.1.1.1', '2026-04-13 10:00:00')

    const page = auditService.getLogs(1, 10)

    expect(page.logs.map((row) => row.username)).toEqual(['third', 'second', 'first'])
  })

  it('trims old entries past the shared retention limit and clears logs', () => {
    const db = getDb()
    const insert = db.prepare(
      'INSERT INTO audit_logs (username, action, details, ip, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    const seed = db.transaction(() => {
      // 内联裁剪上限与 cron 策略共用 AUDIT_LOG_MAX_ROWS（10000），种子数需超过上限才能触发裁剪
      for (let index = 1; index <= 10000; index += 1) {
        insert.run(`user-${index}`, `action-${index}`, '{}', '127.0.0.1', '2000-01-01 00:00:00')
      }
    })
    seed()

    auditService.log('latest', { username: 'newest' })

    expect(db.prepare('SELECT COUNT(*) AS count FROM audit_logs').get().count).toBe(10000)
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM audit_logs WHERE username = ?').get('newest').count
    ).toBe(1)

    expect(auditService.clear()).toBe(true)
    expect(db.prepare('SELECT COUNT(*) AS count FROM audit_logs').get().count).toBe(0)
  })

  it('clears before a cutoff across both T-form and space-form timestamps', () => {
    const db = getDb()
    const insert = db.prepare(
      'INSERT INTO audit_logs (username, action, details, ip, created_at) VALUES (?, ?, ?, ?, ?)'
    )

    // T 形（新库）与空格形（旧库）在同一截止日期的早于 cutoff 时段都必须被删，
    // 避免裸字符串比较在同一日期前缀下 'T' > ' ' 造成 T 形行漏删
    insert.run('t-before', 'older', '{}', '1.1.1.1', '2026-04-12T05:00:00.000Z')
    insert.run('s-before', 'older', '{}', '1.1.1.1', '2026-04-12 05:00:00')
    insert.run('prev-day-t', 'older', '{}', '1.1.1.1', '2026-04-11T23:59:59.000Z')
    // cutoff 之后的行必须保留
    insert.run('t-after', 'keep', '{}', '1.1.1.1', '2026-04-12T07:00:00.000Z')
    insert.run('s-after', 'keep', '{}', '1.1.1.1', '2026-04-12 07:00:00')
    insert.run('next-day', 'keep', '{}', '1.1.1.1', '2026-04-13T00:00:00.000Z')

    expect(auditService.clear('2026-04-12 06:00:00')).toBe(true)

    expect(
      db
        .prepare('SELECT username FROM audit_logs ORDER BY username ASC')
        .all()
        .map((row) => row.username)
    ).toEqual(['next-day', 's-after', 't-after'])
  })
})
