import { getDb } from '../database/database.js'
import { logger } from '../../utils/logger.js'
import { DEFAULT_THEME_PRESET } from '../../../shared/theme.js'
import type { CountRow } from '../../types/sqliteRows.js'

export const bootstrapDefaultsService = {
  initSettings() {
    const db = getDb()

    const count = db.prepare<CountRow>('SELECT COUNT(*) as count FROM settings').get()?.count ?? 0
    if (count === 0) {
      const defaults = {
        registrationEnabled: false,
        defaultUserLevel: 1,
        backgroundUrl: '',
        themePreset: DEFAULT_THEME_PRESET,
        themeColor: ''
      }

      const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      Object.entries(defaults).forEach(([key, value]) => {
        insert.run(key, JSON.stringify(value))
      })

      logger.info('已初始化默认系统设置')
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
