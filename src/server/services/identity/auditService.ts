import { getDb } from '../database/database.js'
import { logger } from '../../utils/logger.js'
import { AUDIT_LOG_MAX_ROWS } from '../system/backupSchedulerService.js'
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
                VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            `
      ).run(username, action, detailsJson, ip)

      // 自动清理旧日志：内联裁剪只作兜底（cron 未运行时表也保持有界），
      // 上限与定时裁剪策略共用 AUDIT_LOG_MAX_ROWS，消除原先硬编码 2000 与
      // cron "90 天/10000 条"策略的矛盾（第 15 轮审查）。
      const count =
        db.prepare<CountRow>('SELECT COUNT(*) as count FROM audit_logs').get()?.count ?? 0
      if (count > AUDIT_LOG_MAX_ROWS) {
        db.prepare(
          `
                    DELETE FROM audit_logs WHERE id IN (
                        SELECT id FROM audit_logs ORDER BY created_at ASC LIMIT ?
                    )
                `
        ).run(count - AUDIT_LOG_MAX_ROWS)
      }
    } catch (err: unknown) {
      logger.error('记录审计日志失败', err)
    }
  },

  /**
   * 清空日志（支持按时间范围）
   * @param before - 可选 ISO 日期字符串，只删除此日期之前的日志
   */
  clear(before?: string) {
    try {
      const db = getDb()
      if (before) {
        db.prepare('DELETE FROM audit_logs WHERE created_at < ?').run(before)
      } else {
        db.prepare('DELETE FROM audit_logs').run()
      }
      return true
    } catch (err: unknown) {
      logger.error('清空审计日志失败', err)
      return false
    }
  }
}
