import { getDb } from '../database/database.js'
import { logger } from '../../utils/logger.js'
import { sanitizeFooterHtml } from '../../../shared/security/footerHtml.js'
import { isAllowedTimezone, normalizeOptionalUrl } from '../../../shared/security/urlSafety.js'
import { resolveEnvTimezone } from '../../utils/envTimezone.js'
import type { SettingsMap } from '../../types/domain.js'
import type { SettingsValueRow, SettingsKeyValueRow } from '../../types/sqliteRows.js'

/**
 * 系统设置服务 (SQLite 版本)
 */
export const settingsService = {
  /**
   * 获取单个设置值
   */
  get(key: string, defaultValue: unknown = null) {
    const db = getDb()
    const row = db.prepare<SettingsValueRow>('SELECT value FROM settings WHERE key = ?').get(key)
    if (row) {
      try {
        return JSON.parse(row.value)
      } catch {
        return row.value
      }
    }
    return defaultValue
  },

  /**
   * 设置单个值
   */
  set(key: string, value: unknown) {
    const db = getDb()
    try {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
        key,
        JSON.stringify(value)
      )
      return true
    } catch (err: unknown) {
      logger.error(`设置保存失败: ${key}`, err)
      return false
    }
  },

  /**
   * 获取所有设置
   */
  getAll() {
    const db = getDb()
    const rows = db.prepare<SettingsKeyValueRow>('SELECT key, value FROM settings').all()
    const settings: SettingsMap = {}
    rows.forEach((row) => {
      try {
        settings[row.key] = JSON.parse(row.value)
      } catch {
        settings[row.key] = row.value
      }
    })
    return settings
  },

  /**
   * 批量更新设置
   */
  updateAll(newSettings: Record<string, unknown>) {
    const db = getDb()
    const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')

    const transaction = db.transaction(() => {
      Object.entries(newSettings).forEach(([key, value]) => {
        insert.run(key, JSON.stringify(value))
      })
    })

    try {
      transaction()
      return true
    } catch (err: unknown) {
      logger.error('批量设置保存失败', err)
      return false
    }
  },

  /**
   * 获取公开设置（前端可访问）
   */
  getPublic() {
    const all = this.getAll()
    const storedTimezone = isAllowedTimezone(all.timezone) ? all.timezone || '' : ''

    return {
      registrationEnabled: all.registrationEnabled || false,
      backgroundUrl: normalizeOptionalUrl(all.backgroundUrl || '', { allowRelative: true }),
      // Prefer DB 系统设置; fall back to compose/env TZ
      timezone: storedTimezone || resolveEnvTimezone() || '',
      homeUrl: normalizeOptionalUrl(all.homeUrl || '', { allowRelative: true }),
      footerHtml: sanitizeFooterHtml(all.footerHtml || ''),
      siteName: all.siteName || '',
      logoUrl: normalizeOptionalUrl(all.logoUrl || '', { allowRelative: true }),
      faviconUrl: normalizeOptionalUrl(all.faviconUrl || '', { allowRelative: true })
    }
  }
}
