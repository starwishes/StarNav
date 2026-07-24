import { getDb } from '../services/database/database.js'
import { logger } from '../utils/logger.js'
import type {
  DailyStatRow,
  DailyStatTotalsRow,
  NameValueStatRow
} from '../types/sqliteRows.js'

const STATS_RETENTION_DAYS = 60
const TREND_DAYS = 7

let lastCleanupDate = ''

const toDateKey = (date = new Date()) => date.toISOString().split('T')[0]

const buildTrend = (rows: DailyStatRow[], today: string) => {
  const trendMap = new Map(rows.map((row) => [row.date, row]))
  const trend: Array<{ date: string; pv: number; uv: number }> = []

  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date(`${today}T00:00:00.000Z`)
    date.setUTCDate(date.getUTCDate() - i)
    const dateKey = toDateKey(date)
    const row = trendMap.get(dateKey)

    trend.push({
      date: dateKey,
      pv: row?.pv || 0,
      uv: row?.uv || 0
    })
  }

  return trend
}

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
 * 访问统计模型 (SQLite 版本)
 */
export const Stats = {
  /**
   * 获取所有统计数据
   */
  getAll() {
    const db = getDb()

    // 获取总量
    const totals = db
      .prepare<DailyStatTotalsRow>(
        `
            SELECT 
                COALESCE(SUM(pv), 0) as total_pv,
                COALESCE(SUM(uv), 0) as total_uv
            FROM daily_stats
        `
      )
      .get() || { total_pv: 0, total_uv: 0 }

    // 获取每日数据
    const dailyRows = db
      .prepare<DailyStatRow>(
        `
            SELECT date, pv, uv FROM daily_stats ORDER BY date DESC LIMIT 60
        `
      )
      .all()

    const daily: Record<string, { pv: number; uv: number }> = {}
    dailyRows.forEach((row) => {
      daily[row.date] = { pv: row.pv, uv: row.uv }
    })

    return {
      total_pv: totals.total_pv,
      total_uv: totals.total_uv,
      daily
    }
  },

  /**
   * 获取概览数据（用于前端展示）
   */
  getSummary() {
    const db = getDb()
    const today = toDateKey()

    // 获取总量
    const totals = db
      .prepare<DailyStatTotalsRow>(
        `
            SELECT 
                COALESCE(SUM(pv), 0) as total_pv,
                COALESCE(SUM(uv), 0) as total_uv
            FROM daily_stats
        `
      )
      .get() || { total_pv: 0, total_uv: 0 }

    // 获取今日数据
    const todayStats = db
      .prepare<Pick<DailyStatRow, 'pv' | 'uv'>>(
        `
            SELECT pv, uv FROM daily_stats WHERE date = ?
        `
      )
      .get(today) || { pv: 0, uv: 0 }

    // 获取最近 7 天趋势
    const trendStart = new Date(`${today}T00:00:00.000Z`)
    trendStart.setUTCDate(trendStart.getUTCDate() - (TREND_DAYS - 1))
    const trendRows = db
      .prepare<DailyStatRow>(
        `
            SELECT date, pv, uv
            FROM daily_stats
            WHERE date BETWEEN ? AND ?
            ORDER BY date ASC
        `
      )
      .all(toDateKey(trendStart), today)
    const trend = buildTrend(trendRows, today)

    // 聚合 OS 和 Browser 数据（最近 30 天）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0]

    const osStats = db
      .prepare<NameValueStatRow>(
        `
            SELECT os as name, COUNT(*) as value 
            FROM visit_logs 
            WHERE date >= ? AND os IS NOT NULL
            GROUP BY os
            ORDER BY value DESC
        `
      )
      .all(thirtyDaysStr)

    const browserStats = db
      .prepare<NameValueStatRow>(
        `
            SELECT browser as name, COUNT(*) as value 
            FROM visit_logs 
            WHERE date >= ? AND browser IS NOT NULL
            GROUP BY browser
            ORDER BY value DESC
        `
      )
      .all(thirtyDaysStr)

    return {
      total_pv: totals.total_pv,
      total_uv: totals.total_uv,
      today_pv: todayStats.pv,
      today_uv: todayStats.uv,
      trend,
      distribution: {
        os: osStats,
        browser: browserStats
      }
    }
  },

  /**
   * 记录访问
   */
  recordVisit({ ip, os, browser, referrer }: { ip?: string; os?: string; browser?: string; referrer?: string }) {
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
      const existing = db.prepare<DailyStatRow>('SELECT * FROM daily_stats WHERE date = ?').get(today)
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
