import { logger } from '../../utils/logger.js'
import { invalidateCache as invalidateBookmarkSnapshotCache } from '../bookmark/cache.js'
import { cacheService as cacheDefault } from './cacheService.js'
import { CacheKeys } from './cacheDefinitionService.js'
import { USER_LEVEL } from '../../../shared/constants.js'
import type { CacheRuntimeService } from './cacheRuntimeService.js'

type CacheLike = Pick<CacheRuntimeService, 'del'> & {
  cache: { keys: () => string[] }
}

export function clearByPrefix(prefix: string, cacheService: CacheLike) {
  const keys = cacheService.cache.keys()
  let cleared = 0

  keys.forEach((key) => {
    if (key.startsWith(prefix)) {
      cacheService.del(key)
      cleared++
    }
  })

  if (cleared > 0) {
    logger.debug(`已清除 ${cleared} 个缓存（前缀: ${prefix}）`)
  }

  return cleared
}

export function clearDataCache(cacheService: CacheLike) {
  clearByPrefix('categories:simple:', cacheService)
  for (let level = USER_LEVEL.GUEST; level <= USER_LEVEL.ADMIN; level++) {
    cacheService.del(CacheKeys.data(level))
  }
}

export function clearSearchCache(cacheService: CacheLike) {
  return clearByPrefix('search:', cacheService)
}

export type InvalidateBookmarkCachesOptions = {
  /** Default true. Click tracking can skip search TTL (results rarely need fresh clickCount). */
  includeSearch?: boolean
  /** Default true. Set false when snapshot was already patched in place. */
  includeSnapshot?: boolean
}

/**
 * 书签域统一失效：快照缓存 + data/search TTL 缓存。
 * 写路径默认全量；点击统计可用 options 做窄失效。
 */
export function invalidateBookmarkCaches(
  cacheService: CacheLike = cacheDefault,
  options: InvalidateBookmarkCachesOptions = {}
) {
  const includeSearch = options.includeSearch !== false
  const includeSnapshot = options.includeSnapshot !== false

  if (includeSnapshot) {
    invalidateBookmarkSnapshotCache()
  }
  clearDataCache(cacheService)
  if (includeSearch) {
    clearSearchCache(cacheService)
  }
}

export const cacheInvalidationService = {
  clearByPrefix,
  clearDataCache,
  clearSearchCache,
  invalidateBookmarkCaches
}
