import { getDb } from '../database/database.js'
import { logger } from '../../utils/logger.js'
import type { AuditLogInput } from '../../types/domain.js'
import type { AuditLogRow, CountRow } from '../../types/sqliteRows.js'

/**
 * 审计日志服务 (SQLite 版本)
 */
export const auditService = {
  /**
   * 获取日志 (支持分页)
   */
  getLogs(page = 1, limit = 50) {
    const db = getDb()
    const offset = (page - 1) * limit

    const total = db.prepare<CountRow>('SELECT COUNT(*) as count FROM audit_logs').get()?.count ?? 0
    const logs = db
      .prepare<AuditLogRow>(
        `
            SELECT id, username, action, details, ip, created_at as timestamp
            FROM audit_logs 
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `
      )
      .all(limit, offset)

    return { total, logs }
  },

  /**
   * 记录日志
   */
  log(action: string, data: AuditLogInput = {}) {
    try {
      const db = getDb()
      const {
        username = 'anonymous',
        ip = 'unknown',
        userAgent = 'unknown',
        success = true,
        details = ''
      } = data

      const detailsJson = JSON.stringify({
        success,
        userAgent,
        message: details
      })

      db.prepare(
        `
                INSERT INTO audit_logs (username, action, details, ip, created_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            `
      ).run(username, action, detailsJson, ip)

      // 自动清理旧日志 (保留最近 2000 条)
      const count = db.prepare<CountRow>('SELECT COUNT(*) as count FROM audit_logs').get()?.count ?? 0
      if (count > 2000) {
        db.prepare(
          `
                    DELETE FROM audit_logs WHERE id IN (
                        SELECT id FROM audit_logs ORDER BY created_at ASC LIMIT ?
                    )
                `
        ).run(count - 2000)
      }
    } catch (err: unknown) {
      logger.error('记录审计日志失败', err)
    }
  },

  /**
   * 清空日志
   */
  clear() {
    try {
      const db = getDb()
      db.prepare('DELETE FROM audit_logs').run()
      return true
    } catch (err: unknown) {
      logger.error('清空审计日志失败', err)
      return false
    }
  }
}
