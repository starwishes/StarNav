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
      expect(sessionService.getByUsername('testuser')).toEqual([])
      expect(sessionService.cleanup()).toBe(0)
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

  describe('renameUsername', () => {
    it('should migrate session ownership to the new username', () => {
      sessionService.create('olduser', '127.0.0.1', 'Browser 1')
      sessionService.create('olduser', '192.168.1.1', 'Browser 2')

      const migratedCount = sessionService.renameUsername('olduser', 'newuser')

      expect(migratedCount).toBe(2)
      expect(sessionService.getByUsername('olduser')).toEqual([])
      expect(sessionService.getByUsername('newuser')).toHaveLength(2)
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
