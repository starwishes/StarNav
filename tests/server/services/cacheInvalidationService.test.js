// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: {
    debug: vi.fn()
  }
}))

vi.mock('../../../src/server/services/bookmark/cache.js', () => ({
  invalidateCache: vi.fn()
}))

vi.mock('../../../src/server/services/cache/cacheService.js', () => ({
  cacheService: {
    cache: { keys: vi.fn().mockReturnValue([]) },
    del: vi.fn()
  }
}))

const { clearByPrefix, clearDataCache, clearSearchCache, invalidateBookmarkCaches } =
  await import('../../../src/server/services/cache/cacheInvalidationService.js')
const { invalidateCache } = await import('../../../src/server/services/bookmark/cache.js')
const { logger } = await import('../../../src/server/utils/logger.js')

describe('cacheInvalidationService', () => {
  let cacheService

  beforeEach(() => {
    cacheService = {
      cache: {
        keys: vi.fn().mockReturnValue([])
      },
      del: vi.fn()
    }
    vi.clearAllMocks()
  })

  it('should clear keys by prefix', () => {
    cacheService.cache.keys.mockReturnValue(['search:1:test:10', 'data:level:0', 'search:2:git:5'])
    cacheService.del.mockReturnValue(1)

    const cleared = clearByPrefix('search:', cacheService)

    expect(cacheService.del).toHaveBeenCalledWith('search:1:test:10')
    expect(cacheService.del).toHaveBeenCalledWith('search:2:git:5')
    expect(cacheService.del).not.toHaveBeenCalledWith('data:level:0')
    expect(cleared).toBe(2)
    expect(logger.debug).toHaveBeenCalledWith('已清除 2 个缓存（前缀: search:）')
  })

  it('should clear snapshot cache keys', () => {
    cacheService.cache.keys.mockReturnValue(['categories:simple:0', 'categories:simple:2'])

    clearDataCache(cacheService)

    expect(cacheService.del).toHaveBeenCalledWith('categories:simple:0')
    expect(cacheService.del).toHaveBeenCalledWith('categories:simple:2')
    expect(cacheService.del).toHaveBeenCalledWith('data:level:0')
    expect(cacheService.del).toHaveBeenCalledWith('data:level:1')
    expect(cacheService.del).toHaveBeenCalledWith('data:level:2')
    expect(cacheService.del).toHaveBeenCalledWith('data:level:3')
  })

  it('should delegate search invalidation to prefix clearing', () => {
    cacheService.cache.keys.mockReturnValue(['search:1:test:10'])

    const cleared = clearSearchCache(cacheService)

    expect(cleared).toBe(1)
    expect(cacheService.del).toHaveBeenCalledWith('search:1:test:10')
  })

  it('should invalidate bookmark snapshot and TTL caches together', () => {
    cacheService.cache.keys.mockReturnValue(['search:1:test:10', 'categories:simple:0'])

    invalidateBookmarkCaches(cacheService)

    expect(invalidateCache).toHaveBeenCalled()
    expect(cacheService.del).toHaveBeenCalledWith('categories:simple:0')
    expect(cacheService.del).toHaveBeenCalledWith('data:level:0')
    expect(cacheService.del).toHaveBeenCalledWith('search:1:test:10')
  })

  it('should support narrow invalidation for click-hot path', () => {
    cacheService.cache.keys.mockReturnValue(['search:1:test:10', 'categories:simple:0'])

    invalidateBookmarkCaches(cacheService, { includeSnapshot: false, includeSearch: false })

    expect(invalidateCache).not.toHaveBeenCalled()
    expect(cacheService.del).toHaveBeenCalledWith('categories:simple:0')
    expect(cacheService.del).toHaveBeenCalledWith('data:level:0')
    expect(cacheService.del).not.toHaveBeenCalledWith('search:1:test:10')
  })
})
