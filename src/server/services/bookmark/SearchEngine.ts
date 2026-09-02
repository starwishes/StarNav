import { getDb } from '../database/database.js'
import { errors } from '../../utils/errors.js'
import { mapBookmarkSearchResult } from './recordTransforms.js'
import type { LevelLike } from '../../types/domain.js'
import type { BookmarkSearchRow } from '../../types/sqliteRows.js'

const BOOKMARK_SEARCH_SELECT = `
  SELECT
    items.id,
    items.name,
    items.url,
    items.description,
    items.category_id as categoryId,
    categories.name as categoryName
  FROM items
  LEFT JOIN categories ON categories.id = items.category_id
`

const toNonNegativeInteger = (value: LevelLike, name: string): number => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw errors.badRequest(`${name} 必须是非负整数`)
  }
  return parsed
}

/**
 * LIKE 通配符转义：用户输入的 `%`/`_`/`\` 应作为字面量，
 * 否则 `%` 会匹配所有行、`_` 变成单字符通配。
 */
const escapeLikePattern = (keyword: string) => keyword.replace(/[\\%_]/g, (char) => `\\${char}`)

/**
 * 搜索书签：按名称 / URL / 描述做不区分大小写的模糊匹配（LIKE）。
 * 无关键词时返回最近访问的书签（同样受 level 过滤）。
 */
export function searchBookmarks(keyword: string, level: LevelLike = 0, limit: LevelLike = 10) {
  const db = getDb()
  const lowerKeyword = (keyword || '').toLowerCase()
  const normalizedLevel = toNonNegativeInteger(level, 'level')
  // 与上层 bookmarkQueryService.normalizeLimit 保持一致的上限钳制（100），
  // 防止直接调用本函数时传入超大 limit 撑爆内存/拖垮查询
  const normalizedLimit = Math.min(toNonNegativeInteger(limit, 'limit'), 100)

  let items: BookmarkSearchRow[]
  if (!lowerKeyword) {
    items = db
      .prepare<BookmarkSearchRow>(
        `
          ${BOOKMARK_SEARCH_SELECT}
          WHERE items.level <= ?
            AND (items.category_id IS NULL OR categories.level <= ?)
          ORDER BY items.last_visited DESC NULLS LAST
          LIMIT ?
        `
      )
      .all(normalizedLevel, normalizedLevel, normalizedLimit)
  } else {
    const pattern = `%${escapeLikePattern(lowerKeyword)}%`
    items = db
      .prepare<BookmarkSearchRow>(
        `
          ${BOOKMARK_SEARCH_SELECT}
          WHERE items.level <= ?
            AND (items.category_id IS NULL OR categories.level <= ?)
            AND (
              LOWER(items.name) LIKE ? ESCAPE '\\'
              OR LOWER(items.url) LIKE ? ESCAPE '\\'
              OR LOWER(items.description) LIKE ? ESCAPE '\\'
            )
          ORDER BY items.last_visited DESC NULLS LAST
          LIMIT ?
        `
      )
      .all(normalizedLevel, normalizedLevel, pattern, pattern, pattern, normalizedLimit)
  }

  return items
    .map((item) => mapBookmarkSearchResult(item))
    .filter((item): item is NonNullable<typeof item> => item != null)
}
