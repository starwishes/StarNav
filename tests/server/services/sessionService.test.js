// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { sessionService } from '../../../src/server/services/identity/sessionService.js'
import { getDb } from '../../../src/server/services/database/database.js'

describe('SessionService', () => {
  beforeEach(() => {
    // 清理测试数据
    const db = getDb()
    db.prepare('DELETE FROM sessions').run()
  })

  describe('create', () => {
    it('should create a new session', () => {
      const sessionId = sessionService.create('testuser', '127.0.0.1', 'Test Browser')

      expect(sessionId).toBeTruthy()
      expect(typeof sessionId).toBe('string')
    })

    it('should reuse existing valid session', () => {
      const sessionId1 = sessionService.create('testuser', '127.0.0.1', 'Test Browser')
      const sessionId2 = sessionService.create('testuser', '127.0.0.1', 'Test Browser')

      expect(sessionId1).toBe(sessionId2)
    })

    it('should create a new session when a same-day ISO session is already expired', () => {
      const db = getDb()
      const today = new Date().toISOString().split('T')[0]
      const expiredSessionId = 'expired-same-day'

      db.prepare(
        `
          INSERT INTO sessions (
            session_id,
            username,
            ip,
            user_agent,
            created_at,
            last_active_at,
            expires_at
          ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        `
      ).run(expiredSessionId, 'testuser', '127.0.0.1', 'Test Browser', `${today}T00:00:00.000Z`)

      const sessionId = sessionService.create('testuser', '127.0.0.1', 'Test Browser')

      expect(sessionId).not.toBe(expiredSessionId)
    })
  })

  describe('validate', () => {
    it('should validate existing session', () => {
      const sessionId = sessionService.create('testuser', '127.0.0.1', 'Test Browser')
      const isValid = sessionService.validate(sessionId)

      expect(isValid).toBeTruthy()
    })

    it('should return false for non-existent session', () => {
      const isValid = sessionService.validate('invalid-session-id')

      expect(isValid).toBeFalsy()
    })

    it('should treat same-day ISO sessions as expired once their timestamp has passed', () => {
      const db = getDb()
      const today = new Date().toISOString().split('T')[0]
      const expiredSessionId = 'expired-same-day'

      db.prepare(
        `
          INSERT INTO sessions (
            session_id,
            username,
            ip,
            user_agent,
            created_at,
            last_active_at,
            expires_at
          ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        `
      ).run(expiredSessionId, 'testuser', '127.0.0.1', 'ISO Browser', `${today}T00:00:00.000Z`)

      expect(sessionService.validate(expiredSessionId)).toBeFalsy()
      // validate 对过期会话执行吊销（删除行），独立验证该副作用，不再依赖 cleanup 的返回值
      const remaining = db
        .prepare('SELECT COUNT(*) as count FROM sessions WHERE session_id = ?')
        .get(expiredSessionId).count
      expect(remaining).toBe(0)
    })

    it('should treat legacy space-format expires_at rows as valid until they expire', () => {
      const db = getDb()
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      // round-4 前 datetime('now') 写入的 'YYYY-MM-DD HH:MM:SS'（空格格式）
      const spaceFormat = tomorrow
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '')
      const sessionId = 'legacy-space-format'

      db.prepare(
        `
          INSERT INTO sessions (
            session_id,
            username,
            ip,
            user_agent,
            created_at,
            last_active_at,
            expires_at
          ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        `
      ).run(sessionId, 'testuser', '127.0.0.1', 'Legacy Browser', spaceFormat)

      expect(sessionService.validate(sessionId)).toBeTruthy()
      expect(sessionService.getByUsername('testuser').map((s) => s.sessionId)).toContain(sessionId)
    })

    it('should keep a session valid until its same-day expiry timestamp is reached', () => {
      const db = getDb()
      const endOfToday = new Date()
      endOfToday.setUTCHours(23, 59, 59, 999)
      const sessionId = 'expires-end-of-today'

      db.prepare(
        `
          INSERT INTO sessions (
            session_id,
            username,
            ip,
            user_agent,
            created_at,
            last_active_at,
            expires_at
          ) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?)
        `
      ).run(sessionId, 'testuser', '127.0.0.1', 'Browser', endOfToday.toISOString())

      expect(sessionService.validate(sessionId)).toBeTruthy()
      expect(sessionService.getByUsername('testuser').map((s) => s.sessionId)).toContain(sessionId)
      expect(sessionService.cleanup()).toBe(0)
    })

    it('should refresh last_active_at when it is older than 5 minutes on the same day', () => {
      const sessionId = sessionService.create('testuser', '127.0.0.1', 'Browser')
      const db = getDb()
      const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      db.prepare('UPDATE sessions SET last_active_at = ? WHERE session_id = ?').run(
        stale,
        sessionId
      )

      sessionService.validate(sessionId)

      const row = db
        .prepare('SELECT last_active_at FROM sessions WHERE session_id = ?')
        .get(sessionId)
      expect(row.last_active_at).not.toBe(stale)
      expect(row.last_active_at).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/)
    })

    it('should not refresh last_active_at when it is newer than 5 minutes', () => {
      const sessionId = sessionService.create('testuser', '127.0.0.1', 'Browser')
      const db = getDb()
      const fresh = new Date().toISOString()
      db.prepare('UPDATE sessions SET last_active_at = ? WHERE session_id = ?').run(
        fresh,
        sessionId
      )

      sessionService.validate(sessionId)

      const row = db
        .prepare('SELECT last_active_at FROM sessions WHERE session_id = ?')
        .get(sessionId)
      expect(row.last_active_at).toBe(fresh)
    })
  })

  describe('revoke', () => {
    it('should revoke the session', () => {
      const sessionId = sessionService.create('testuser', '127.0.0.1', 'Test Browser')
      const result = sessionService.revoke(sessionId)

      expect(result).toBeTruthy()

      const isValid = sessionService.validate(sessionId)
      expect(isValid).toBeFalsy()
    })
  })

  describe('getByUsername', () => {
    it('should return all sessions for a user', () => {
      sessionService.create('testuser', '127.0.0.1', 'Browser 1')
      sessionService.create('testuser', '192.168.1.1', 'Browser 2')

      const sessions = sessionService.getByUsername('testuser')

      expect(sessions.length).toBe(2)
    })

    it('should return empty array for user with no sessions', () => {
      const sessions = sessionService.getByUsername('nonexistent')

      expect(sessions).toEqual([])
    })
  })

  describe('revokeOthers', () => {
    it('should keep current session and revoke others', () => {
      const session1 = sessionService.create('testuser', '127.0.0.1', 'Browser 1')
      sessionService.create('testuser', '192.168.1.1', 'Browser 2')
      sessionService.create('testuser', '192.168.1.2', 'Browser 3')

      const revokedCount = sessionService.revokeOthers('testuser', session1)

      expect(revokedCount).toBe(2)

      const sessions = sessionService.getByUsername('testuser')
      expect(sessions.length).toBe(1)
    })
  })

  describe('revokeByUsername', () => {
    it('should remove all sessions for a username', () => {
      sessionService.create('testuser', '127.0.0.1', 'Browser 1')
      sessionService.create('testuser', '192.168.1.1', 'Browser 2')

      const revokedCount = sessionService.revokeByUsername('testuser')

      expect(revokedCount).toBe(2)
      expect(sessionService.getByUsername('testuser')).toEqual([])
    })
  })

  describe('cleanup', () => {
    it('should remove expired sessions', () => {
      // 创建会话
      sessionService.create('testuser', '127.0.0.1', 'Browser')

      // 手动设置为过期
      const db = getDb()
      db.prepare("UPDATE sessions SET expires_at = datetime('now', '-1 day')").run()

      const removedCount = sessionService.cleanup()

      expect(removedCount).toBe(1)
    })

    it('should keep valid sessions', () => {
      sessionService.create('testuser', '127.0.0.1', 'Browser')

      const removedCount = sessionService.cleanup()

      expect(removedCount).toBe(0)
    })

    it('should remove same-day ISO sessions whose timestamp has already passed', () => {
      const db = getDb()
      const today = new Date().toISOString().split('T')[0]

      db.prepare(
        `
          INSERT INTO sessions (
            session_id,
            username,
            ip,
            user_agent,
            created_at,
            last_active_at,
            expires_at
          ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        `
      ).run('expired-cleanup', 'testuser', '127.0.0.1', 'Browser', `${today}T00:00:00.000Z`)

      const removedCount = sessionService.cleanup()

      expect(removedCount).toBe(1)
    })
  })
})
