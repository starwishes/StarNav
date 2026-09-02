import { getDb } from '../database/database.js'
import { mapBookmarkRow } from './recordTransforms.js'
import type { LevelLike } from '../../types/domain.js'
import type { BookmarkItemRow } from '../../types/sqliteRows.js'

const buildCategoryFilter = (validCategoryIds: Set<unknown> | null) => {
  if (validCategoryIds === null) {
    return { clause: '', params: [] as number[] }
  }

  const categoryIds = Array.from(validCategoryIds)
    .map((categoryId) => Number(categoryId))
    .filter((categoryId) => Number.isInteger(categoryId) && categoryId > 0)

  if (categoryIds.length === 0) {
    return {
      clause: ' AND (category_id IS NULL OR category_id = 0)',
      params: [] as number[]
    }
  }

  return {
    clause: ` AND (category_id IS NULL OR category_id = 0 OR category_id IN (${categoryIds.map(() => '?').join(', ')}))`,
    params: categoryIds
  }
}

export const bookmarkReadService = {
  getAll(level: LevelLike = 0, validCategoryIds: Set<unknown> | null = null) {
    const db = getDb()
    const normalizedLevel = Number(level) || 0
    const { clause, params } = buildCategoryFilter(validCategoryIds)
    const items = db
      .prepare<BookmarkItemRow>(
        `
          SELECT
            id,
            name,
            url,
            description,
            icon,
            category_id as categoryId,
            pinned,
            level,
            click_count as clickCount,
            last_visited as lastVisited
          FROM items
          WHERE level <= ?${clause}
          ORDER BY sort_order, id
        `
      )
      .all(normalizedLevel, ...params)

    return items
      .map((item) => mapBookmarkRow(item))
      .filter((item): item is NonNullable<typeof item> => item != null)
  },

  checkUrl(url: string, level: LevelLike = 0) {
    const db = getDb()
    const normalizedLevel = Number(level) || 0
    const item = db
      .prepare<BookmarkItemRow>(
        `
          SELECT
            items.id,
            items.name,
            items.url,
            items.description,
            items.icon,
            items.category_id as categoryId,
            items.pinned,
            items.level,
            items.click_count as clickCount,
            items.last_visited as lastVisited,
            items.sort_order as sortOrder
          FROM items
          LEFT JOIN categories ON categories.id = items.category_id
          WHERE items.url = ?
            AND items.level <= ?
            AND (items.category_id IS NULL OR categories.level <= ?)
          LIMIT 1
        `
      )
      .get(url, normalizedLevel, normalizedLevel)

    return mapBookmarkRow(item)
  }
}
