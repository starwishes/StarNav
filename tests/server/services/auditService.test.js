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

  it('trims old entries past the retention limit and clears logs', () => {
    const db = getDb()
    const insert = db.prepare(
      'INSERT INTO audit_logs (username, action, details, ip, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    const seed = db.transaction(() => {
      for (let index = 1; index <= 2000; index += 1) {
        insert.run(`user-${index}`, `action-${index}`, '{}', '127.0.0.1', '2000-01-01 00:00:00')
      }
    })
    seed()

    auditService.log('latest', { username: 'newest' })

    expect(db.prepare('SELECT COUNT(*) AS count FROM audit_logs').get().count).toBe(2000)
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM audit_logs WHERE username = ?').get('newest').count
    ).toBe(1)

    expect(auditService.clear()).toBe(true)
    expect(db.prepare('SELECT COUNT(*) AS count FROM audit_logs').get().count).toBe(0)
  })
})
