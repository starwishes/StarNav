import { logger } from '../../utils/logger.js'
import { invalidateCache as invalidateBookmarkSnapshotCache } from '../bookmark/cache.js'
import cacheDefault from './cacheService.js'
import { CacheKeys } from './cacheDefinitionService.js'
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
  for (let level = 0; level <= 3; level++) {
    cacheService.del(CacheKeys.data(level))
  }
}

export function clearSearchCache(cacheService: CacheLike) {
  return clearByPrefix('search:', cacheService)
}

export function clearUserCache(username: string, cacheService: CacheLike) {
  return cacheService.del(CacheKeys.userInfo(username))
}

/**
 * 书签域统一失效：快照缓存 + data/search TTL 缓存。
 */
export function invalidateBookmarkCaches(cacheService: CacheLike = cacheDefault) {
  invalidateBookmarkSnapshotCache()
  clearDataCache(cacheService)
  clearSearchCache(cacheService)
}

export const cacheInvalidationService = {
  clearByPrefix,
  clearDataCache,
  clearSearchCache,
  clearUserCache,
  invalidateBookmarkCaches
}
