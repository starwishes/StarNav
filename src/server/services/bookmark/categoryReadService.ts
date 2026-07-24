import { getDb } from '../database/database.js'
import { mapCategoryRow } from './recordTransforms.js'
import type { LevelLike } from '../../types/domain.js'
import type { CategoryRow, CategoryIdRow } from '../../types/sqliteRows.js'

export const categoryReadService = {
  getAll(level: LevelLike = 0) {
    const db = getDb()
    const normalizedLevel = Number(level) || 0
    const categories = db
      .prepare<CategoryRow>(
        'SELECT id, name, icon, level, sort_order, parent_id as parentId FROM categories WHERE level <= ? ORDER BY sort_order, id'
      )
      .all(normalizedLevel)

    return categories
      .map((category) => mapCategoryRow(category))
      .filter((category): category is NonNullable<typeof category> => category != null)
  },

  getValidIds(level: LevelLike = 0) {
    const db = getDb()
    const normalizedLevel = Number(level) || 0
    const categories = db
      .prepare<CategoryIdRow>('SELECT id FROM categories WHERE level <= ? ORDER BY sort_order, id')
      .all(normalizedLevel)
    return new Set(categories.map((category) => Number(category.id)))
  }
}
