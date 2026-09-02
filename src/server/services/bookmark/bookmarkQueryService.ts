import { errors } from '../../utils/errors.js'
import { CacheKeys, CacheTTL } from '../cache/cacheDefinitionService.js'
import { cacheService as cache } from '../cache/cacheService.js'
import { bookmarkSnapshotService } from './bookmarkSnapshotService.js'
import { bookmarkLookupService } from './bookmarkLookupService.js'
import { normalizeLevel } from './levelUtils.js'

type LevelLike = number | string | null | undefined

const MAX_SEARCH_LIMIT = 100
const MAX_KEYWORD_LENGTH = 100

const normalizeLimit = (limit: LevelLike) => {
  const parsed = Number.parseInt(String(limit ?? 10), 10)
  if (Number.isNaN(parsed) || parsed <= 0) return 10
  return Math.min(parsed, MAX_SEARCH_LIMIT)
}

// 缓存键归一化：关键字去空格、转小写并截断，防止任意长度/变体关键字撑爆内存缓存
const normalizeKeyword = (keyword: string) =>
  String(keyword || '')
    .trim()
    .toLowerCase()
    .slice(0, MAX_KEYWORD_LENGTH)

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

  searchBookmarks(level: LevelLike, keyword: string, limit: LevelLike) {
    const normalizedLevel = normalizeLevel(level)
    const normalizedLimit = normalizeLimit(limit)
    const normalizedKeyword = normalizeKeyword(keyword)
    const cacheKey = CacheKeys.search(normalizedLevel, normalizedKeyword, normalizedLimit)

    let items = cache.get(cacheKey)
    if (!items) {
      items = bookmarkLookupService.searchItems(normalizedKeyword, normalizedLimit, normalizedLevel)
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

  checkBookmark(level: LevelLike, url: string) {
    if (!url) {
      throw errors.badRequest('URL 不能为空')
    }

    const normalizedLevel = normalizeLevel(level)
    const item = bookmarkLookupService.checkUrlItem(url, normalizedLevel)
    return {
      exists: !!item,
      item
    }
  }
}
