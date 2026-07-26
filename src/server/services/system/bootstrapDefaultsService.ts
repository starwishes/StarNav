import { getDb } from '../database/database.js'
import { logger } from '../../utils/logger.js'
import { resolveEnvTimezone } from '../../utils/envTimezone.js'
import type { CountRow } from '../../types/sqliteRows.js'

const REMOVED_SETTINGS_KEYS = ['themePreset', 'themeColor'] as const

export const bootstrapDefaultsService = {
  initSettings() {
    const db = getDb()
    const envTimezone = resolveEnvTimezone()

    // Older installs may still store removed theme fields; drop them on boot.
    db.prepare(
      `DELETE FROM settings WHERE key IN (${REMOVED_SETTINGS_KEYS.map(() => '?').join(', ')})`
    ).run(...REMOVED_SETTINGS_KEYS)

    const count = db.prepare<CountRow>('SELECT COUNT(*) as count FROM settings').get()?.count ?? 0
    if (count === 0) {
      const defaults: Record<string, unknown> = {
        registrationEnabled: false,
        defaultUserLevel: 1,
        backgroundUrl: '',
        timezone: envTimezone
      }

      const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      Object.entries(defaults).forEach(([key, value]) => {
        insert.run(key, JSON.stringify(value))
      })

      logger.info(
        envTimezone
          ? `已初始化默认系统设置（时区: ${envTimezone}）`
          : '已初始化默认系统设置'
      )
      return
    }

    // Existing DB: only fill empty timezone from compose/env so deploys can pin display TZ
    if (envTimezone) {
      const row = db.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?').get('timezone')
      let current = ''
      if (row?.value !== undefined) {
        try {
          current = JSON.parse(row.value)
        } catch {
          current = String(row.value || '')
        }
      }
      if (!current) {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
          'timezone',
          JSON.stringify(envTimezone)
        )
        logger.info(`已从环境变量写入空缺时区: ${envTimezone}`)
      }
    }
  },

  initDefaultData() {
    if (process.env.NODE_ENV === 'test') {
      return
    }

    const db = getDb()
    const categoryCount = db.prepare<CountRow>('SELECT COUNT(*) as count FROM categories').get()?.count ?? 0
    if (categoryCount === 0) {
      db.prepare(
        `
                INSERT INTO categories(id, name, icon, level, sort_order)
VALUES(1, '常用推荐', '', 0, 0)
    `
      ).run()

      db.prepare(
        `
                INSERT INTO items(id, name, url, description, category_id, pinned, level, sort_order)
VALUES(1, 'Google', 'https://www.google.com', '全球最大搜索引擎', 1, 1, 0, 0)
    `
      ).run()

      logger.info('已创建默认分类和书签')
    }
  }
}
