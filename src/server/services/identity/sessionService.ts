import crypto from 'crypto'
import { getDb } from '../database/database.js'
import { logger } from '../../utils/logger.js'
import type { SessionCreateOptions } from '../../types/domain.js'
import type { SessionRow, SessionListRow } from '../../types/sqliteRows.js'

const SESSION_EXPIRE_DAYS = 7
// 写侧时间统一为 ISO 风格（strftime('%Y-%m-%dT%H:%M:%fZ','now')），
// 比较侧也必须用同一格式做字符串比较。round-4 前使用 datetime('now') 写入的
// 旧数据是 'YYYY-MM-DD HH:MM:SS'（空格格式），直接与 ISO 字符串比较会恒判过期，
// 因此比较前用 replace 把旧格式的空格归一为 'T'（低成本兼容，无副作用）。
// 取舍说明：replace 使 idx_sessions_expires 索引对该表达式非 sargable（无法走索引），
// 但 sessions 表极小（每用户数行），全表扫描成本可忽略；已评估一次性启动迁移
// （UPDATE sessions SET expires_at=replace(expires_at,' ','T')）后再去掉比较侧 replace，
// 但旧备份/旧版本进程恢复的库仍可能混入空格格式，保留 replace 的兼容窗口更稳妥，故维持现状。
const ACTIVE_SESSION_CONDITION = `replace(expires_at, ' ', 'T') > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
const EXPIRED_SESSION_CONDITION = `replace(expires_at, ' ', 'T') <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

/**
 * 会话管理服务 (SQLite 版本)
 */
export const sessionService = {
  /**
   * 创建新会话
   */
  create(
    username: string,
    ip?: string | null,
    userAgent?: string | null,
    options: SessionCreateOptions = {}
  ) {
    const db = getDb()
    const expiresInDays =
      Number.parseInt(String(options.expiresInDays ?? ''), 10) || SESSION_EXPIRE_DAYS

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
      db.prepare(
        `UPDATE sessions SET last_active_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE session_id = ?`
      ).run(existingSession.session_id)
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
            VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?)
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

    // 节流更新最后活跃时间：距上次更新不足 5 分钟时跳过写库，
    // 避免每个已认证请求都触发一次 SQLite 写操作。
    // last_active_at 同样做空格格式归一，避免旧数据被当作"永远过期"而每次刷新。
    db.prepare(
      `UPDATE sessions SET last_active_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE session_id = ? AND replace(last_active_at, ' ', 'T') <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 minutes')`
    ).run(sessionId)

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
