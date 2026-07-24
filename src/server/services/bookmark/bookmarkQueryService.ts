import { errors } from '../../middleware/errorHandler.js'
import { CacheKeys, CacheTTL } from '../cache/cacheDefinitionService.js'
import cache from '../cache/cacheService.js'
import { bookmarkSnapshotService } from './bookmarkSnapshotService.js'
import { bookmarkLookupService } from './bookmarkLookupService.js'

type LevelLike = number | string | null | undefined

const normalizeLevel = (level: LevelLike) => {
  const parsed = Number.parseInt(String(level ?? 0), 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

const normalizeLimit = (limit: LevelLike) => {
  const parsed = Number.parseInt(String(limit ?? 10), 10)
  return Number.isNaN(parsed) || parsed <= 0 ? 10 : parsed
}

export const bookmarkQueryService = {
  getData(level: LevelLike = 0) {
    const normalizedLevel = normalizeLevel(level)
    const cacheKey = CacheKeys.data(normalizedLevel)

    let data = cache.get(cacheKey)
    if (!data) {
      data = bookmarkSnapshotService.getData(normalizedLevel)
      cache.set(cacheKey, data, CacheTTL.MEDIUM)
    }

    return data
  },

  searchBookmarks(
    username: string | null | undefined,
    level: LevelLike,
    keyword: string,
    limit: LevelLike
  ) {
    const normalizedLevel = normalizeLevel(level)
    const normalizedLimit = normalizeLimit(limit)
    const cacheKey = CacheKeys.search(normalizedLevel, keyword, normalizedLimit)

    let items = cache.get(cacheKey)
    if (!items) {
      items = bookmarkLookupService.searchItems(
        username,
        keyword,
        normalizedLimit,
        normalizedLevel
      )
      cache.set(cacheKey, items, CacheTTL.SHORT)
    }

    return { items }
  },

  getSimpleCategories(level: LevelLike = 0) {
    const normalizedLevel = normalizeLevel(level)
    const cacheKey = CacheKeys.categoriesSimple(normalizedLevel)

    let categories = cache.get(cacheKey)
    if (!categories) {
      categories = bookmarkSnapshotService.getCategories(normalizedLevel)
      cache.set(cacheKey, categories, CacheTTL.MEDIUM)
    }

    return { categories }
  },

  checkBookmark(username: string | null | undefined, level: LevelLike, url: string) {
    if (!url) {
      throw errors.badRequest('URL 不能为空')
    }

    const normalizedLevel = normalizeLevel(level)
    const item = bookmarkLookupService.checkUrlItem(username, url, normalizedLevel)
    return {
      exists: !!item,
      item
    }
  }
}
