import { bookmarkReadService } from './bookmarkReadService.js'
import { SearchEngine } from './SearchEngine.js'
import { getCache, hasCache } from './cache.js'
import type { DbRow } from '../../types/domain.js'

const searchEngine = new SearchEngine()

type LevelLike = number | string | null | undefined

export const bookmarkLookupService = {
  checkUrlItem(
    _username: string | null | undefined,
    url: string,
    level: LevelLike = 0
  ) {
    const normalizedLevel = Number(level) || 0
    if (hasCache()) {
      const cache = getCache() as {
        categories: DbRow[]
        items: Array<DbRow & { url?: string; level?: number; categoryId?: number }>
      }
      const validCategoryIds = new Set(
        cache.categories
          .filter((category) => Number(category.level || 0) <= normalizedLevel)
          .map((category) => category.id)
      )
      const existing = cache.items.find(
        (item) =>
          item.url === url &&
          Number(item.level || 0) <= normalizedLevel &&
          (item.categoryId === 0 || validCategoryIds.has(item.categoryId))
      )
      if (existing) {
        return existing
      }
    }

    return bookmarkReadService.checkUrl(url, normalizedLevel)
  },

  searchItems(
    _username: string | null | undefined,
    keyword: string,
    limit: LevelLike = 10,
    level: LevelLike = 0
  ) {
    return searchEngine.search(keyword, Number(level) || 0, Number(limit) || 10)
  }
}
