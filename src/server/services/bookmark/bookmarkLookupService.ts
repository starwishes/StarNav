import { bookmarkReadService } from './bookmarkReadService.js'
import { searchBookmarks } from './SearchEngine.js'
import { getCache, hasCache, type BookmarkSnapshotItem } from './cache.js'
import type { LevelLike } from '../../types/domain.js'

export const bookmarkLookupService = {
  checkUrlItem(url: string, level: LevelLike = 0) {
    const normalizedLevel = Number(level) || 0
    if (hasCache()) {
      const cache = getCache()
      const validCategoryIds = new Set(
        cache?.categories
          .filter((category) => Number(category.level || 0) <= normalizedLevel)
          .map((category) => category.id) ?? []
      )
      const existing = cache?.items.find(
        (item: BookmarkSnapshotItem) =>
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

  searchItems(keyword: string, limit: LevelLike = 10, level: LevelLike = 0) {
    return searchBookmarks(keyword, level, limit)
  }
}
