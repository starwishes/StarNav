import { getDb } from '../database/database.js'
import { mapBookmarkSearchResult } from './recordTransforms.js'
import type { LevelLike } from '../../types/domain.js'
import type { BookmarkSearchRow } from '../../types/sqliteRows.js'

/**
 * 搜索引擎
 * 负责书签的模糊搜索和全文检索
 */
export class SearchEngine {
  /**
   * 搜索书签
   * @param keyword - 关键词
   * @param level - 当前用户权限级别
   * @param limit - 结果限制
   */
  search(keyword: string, level: LevelLike = 0, limit: LevelLike = 10) {
    const db = getDb()
    const lowerKeyword = (keyword || '').toLowerCase()
    const normalizedLevel = Number(level) || 0
    const normalizedLimit = Number(limit) || 10

    let items: BookmarkSearchRow[]
    if (!lowerKeyword) {
      // 无关键词时，返回最近访问的书签
      items = db
        .prepare<BookmarkSearchRow>(
          `
            SELECT
              items.id,
              items.name,
              items.url,
              items.description,
              items.category_id as categoryId,
              categories.name as categoryName
            FROM items
            LEFT JOIN categories ON categories.id = items.category_id
            WHERE items.level <= ? AND (items.category_id IS NULL OR categories.level <= ?)
            ORDER BY items.last_visited DESC NULLS LAST
            LIMIT ?
          `
        )
        .all(normalizedLevel, normalizedLevel, normalizedLimit)
    } else {
      // 模糊搜索：名称、URL、描述
      items = db
        .prepare<BookmarkSearchRow>(
          `
            SELECT
              items.id,
              items.name,
              items.url,
              items.description,
              items.category_id as categoryId,
              categories.name as categoryName
            FROM items
            LEFT JOIN categories ON categories.id = items.category_id
            WHERE items.level <= ?
              AND (items.category_id IS NULL OR categories.level <= ?)
              AND (
                LOWER(items.name) LIKE ?
                OR LOWER(items.url) LIKE ?
                OR LOWER(items.description) LIKE ?
              )
            LIMIT ?
          `
        )
        .all(
          normalizedLevel,
          normalizedLevel,
          `%${lowerKeyword}%`,
          `%${lowerKeyword}%`,
          `%${lowerKeyword}%`,
          normalizedLimit
        )
    }

    return items
      .map((item) => mapBookmarkSearchResult(item))
      .filter((item): item is NonNullable<typeof item> => item != null)
  }
}
