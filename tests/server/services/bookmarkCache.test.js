import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cacheModulePath = '../../../src/server/services/bookmark/cache.js'

const loadCacheModule = async () => import(cacheModulePath)

describe('bookmark cache module', () => {
  beforeEach(async () => {
    vi.resetModules()
    const cache = await loadCacheModule()
    cache.invalidateCache()
  })

  afterEach(async () => {
    const cache = await loadCacheModule()
    cache.invalidateCache()
  })

  it('stores cache payloads and clears them on invalidation', async () => {
    const cache = await loadCacheModule()

    expect(cache.hasCache()).toBe(false)
    expect(cache.getCache()).toBeNull()

    cache.rebuildCache([{ id: 1 }], [{ id: 2 }])

    expect(cache.hasCache()).toBe(true)
    expect(cache.getCache()).toEqual({
      categories: [{ id: 1 }],
      items: [{ id: 2 }]
    })

    cache.invalidateCache()

    expect(cache.hasCache()).toBe(false)
    expect(cache.getCache()).toBeNull()
  })

  it('keeps the cache in sync across fresh module imports via global state', async () => {
    const firstLoad = await loadCacheModule()
    firstLoad.rebuildCache([{ id: 10 }], [{ id: 20 }])

    vi.resetModules()

    const secondLoad = await loadCacheModule()

    expect(secondLoad.hasCache()).toBe(true)
    expect(secondLoad.getCache()).toEqual({
      categories: [{ id: 10 }],
      items: [{ id: 20 }]
    })
  })

  it('patches click stats in place when the snapshot exists', async () => {
    const cache = await loadCacheModule()
    cache.rebuildCache([{ id: 1 }], [{ id: 7, clickCount: 1, lastVisited: null }])

    const patched = cache.patchItemClickInCache(7, 2, '2026-07-26T00:00:00.000Z')

    expect(patched).toBe(true)
    expect(cache.getCache().items[0]).toMatchObject({
      id: 7,
      clickCount: 2,
      lastVisited: '2026-07-26T00:00:00.000Z'
    })
    expect(cache.patchItemClickInCache(999, 1, null)).toBe(false)
  })
})
