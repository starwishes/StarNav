import { getDb } from '../services/database/database.js'
import { logger } from '../utils/logger.js'
import type { DailyStatRow } from '../types/sqliteRows.js'

const STATS_RETENTION_DAYS = 60

let lastCleanupDate = ''

const toDateKey = (date = new Date()) => date.toISOString().split('T')[0]

const cleanupExpiredStats = (db: ReturnType<typeof getDb>, today: string) => {
  if (lastCleanupDate === today) {
    return
  }

  const oldestDate = new Date(`${today}T00:00:00.000Z`)
  oldestDate.setUTCDate(oldestDate.getUTCDate() - STATS_RETENTION_DAYS)
  const oldestDateKey = toDateKey(oldestDate)

  db.prepare('DELETE FROM visit_logs WHERE date < ?').run(oldestDateKey)
  db.prepare('DELETE FROM daily_stats WHERE date < ?').run(oldestDateKey)

  lastCleanupDate = today
}

/**
 * 访问统计模型 (SQLite 版本) —— 仅保留访问记录写入
 */
export const Stats = {
  /**
   * 记录访问
   */
  recordVisit({
    ip,
    os,
    browser,
    referrer
  }: {
    ip?: string
    os?: string
    browser?: string
    referrer?: string
  }) {
    const db = getDb()
    const today = toDateKey()

    try {
      // 尝试插入 IP 记录（如果是新 UV）
      let isNewUv = false
      try {
        db.prepare(
          `
                    INSERT INTO visit_logs (date, ip, os, browser, referrer, created_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                `
        ).run(today, ip, os || null, browser || null, referrer || null)
        isNewUv = true
      } catch {
        // UNIQUE 约束冲突，说明今天这个 IP 已经访问过
        isNewUv = false
      }

      // 更新 daily_stats
      const existing = db
        .prepare<DailyStatRow>('SELECT * FROM daily_stats WHERE date = ?')
        .get(today)
      if (existing) {
        db.prepare(
          `
                    UPDATE daily_stats SET pv = pv + 1, uv = uv + ? WHERE date = ?
                `
        ).run(isNewUv ? 1 : 0, today)
      } else {
        db.prepare(
          `
                    INSERT INTO daily_stats (date, pv, uv) VALUES (?, 1, ?)
                `
        ).run(today, isNewUv ? 1 : 0)
      }

      cleanupExpiredStats(db, today)
    } catch (err: unknown) {
      logger.error('记录访问失败', err)
    }
  }
}
