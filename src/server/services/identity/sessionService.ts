import crypto from 'crypto'
import { getDb } from '../database/database.js'
import { logger } from '../../utils/logger.js'
import type { SessionCreateOptions } from '../../types/domain.js'
import type { SessionRow, SessionListRow } from '../../types/sqliteRows.js'

const SESSION_EXPIRE_DAYS = 7
const ACTIVE_SESSION_CONDITION = `datetime(expires_at) > datetime('now')`
const EXPIRED_SESSION_CONDITION = `datetime(expires_at) <= datetime('now')`

/**
 * 会话管理服务 (SQLite 版本)
 */
export const sessionService = {
  /**
   * 创建新会话
   */
  create(username: string, ip?: string | null, userAgent?: string | null, options: SessionCreateOptions = {}) {
    const db = getDb()
    const expiresInDays = Number.parseInt(String(options.expiresInDays ?? ''), 10) || SESSION_EXPIRE_DAYS

    // 计算过期时间
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // 查找是否存在相同用户、IP 和设备且未过期的会话
    const existingSession = db
      .prepare<Pick<SessionRow, 'session_id' | 'expires_at'>>(
        `
            SELECT session_id, expires_at FROM sessions 
            WHERE username = ? AND ip = ? AND user_agent = ? AND ${ACTIVE_SESSION_CONDITION}
        `
      )
      .get(username, ip, userAgent)

    if (existingSession) {
      // 会话仍然有效，更新活跃时间
      db.prepare(`UPDATE sessions SET last_active_at = datetime('now') WHERE session_id = ?`).run(
        existingSession.session_id
      )
      logger.info(`复用现有会话: ${username} (${existingSession.session_id.substring(0, 8)}...)`)
      return existingSession.session_id
    }

    // 创建新会话
    const sessionId = crypto.randomBytes(16).toString('hex')

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
            )
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        `
    ).run(sessionId, username, ip, userAgent, expiresAt.toISOString())

    logger.info(`创建新会话: ${username} (${sessionId.substring(0, 8)}...)`)
    return sessionId
  },

  /**
   * 验证会话有效性
   */
  validate(sessionId?: string | null) {
    if (!sessionId) return false

    const db = getDb()
    const session = db
      .prepare<SessionRow>(
        `
            SELECT * FROM sessions WHERE session_id = ? AND ${ACTIVE_SESSION_CONDITION}
        `
      )
      .get(sessionId)

    if (!session) {
      // 清理过期会话
      this.revoke(sessionId)
      return false
    }

    // 更新最后活跃时间
    db.prepare(`UPDATE sessions SET last_active_at = datetime('now') WHERE session_id = ?`).run(
      sessionId
    )

    return true
  },

  /**
   * 撤销会话
   */
  revoke(sessionId: string) {
    const db = getDb()
    const result = db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId)

    if (result.changes > 0) {
      logger.info(`会话撤销: ${sessionId.substring(0, 8)}...`)
      return true
    }
    return false
  },

  /**
   * 批量撤销用户的所有会话
   */
  revokeByUsername(username: string) {
    const db = getDb()
    const result = db.prepare('DELETE FROM sessions WHERE username = ?').run(username)

    if (result.changes > 0) {
      logger.info(`已撤销 ${username} 的 ${result.changes} 个会话`)
    }

    return result.changes
  },

  /**
   * 获取用户的所有会话
   */
  getByUsername(username: string): SessionListRow[] {
    const db = getDb()
    return db
      .prepare<SessionListRow>(
        `
            SELECT session_id as sessionId, ip, user_agent as userAgent, 
                   created_at as createdAt, last_active_at as lastActiveAt
            FROM sessions 
            WHERE username = ? AND ${ACTIVE_SESSION_CONDITION}
            ORDER BY last_active_at DESC
        `
      )
      .all(username)
  },

  /**
   * 撤销用户的其他会话
   */
  revokeOthers(username: string, currentSessionId: string) {
    const db = getDb()
    const result = db
      .prepare(
        `
            DELETE FROM sessions WHERE username = ? AND session_id != ?
        `
      )
      .run(username, currentSessionId)

    if (result.changes > 0) {
      logger.info(`撤销 ${username} 的 ${result.changes} 个其他会话`)
    }
    return result.changes
  },

  /**
   * 用户改名后迁移会话归属
   */
  renameUsername(oldUsername: string, newUsername: string) {
    if (!oldUsername || !newUsername || oldUsername === newUsername) {
      return 0
    }

    const db = getDb()
    const result = db
      .prepare(
        `
            UPDATE sessions
            SET username = ?
            WHERE username = ?
        `
      )
      .run(newUsername, oldUsername)

    if (result.changes > 0) {
      logger.info(`会话归属迁移成功: ${oldUsername} -> ${newUsername} (${result.changes})`)
    }

    return result.changes
  },

  /**
   * 清理过期会话
   */
  cleanup() {
    const db = getDb()
    const result = db.prepare(`DELETE FROM sessions WHERE ${EXPIRED_SESSION_CONDITION}`).run()
    if (result.changes > 0) {
      logger.info(`清理了 ${result.changes} 个过期会话`)
    }
    return result.changes
  }
}
