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
})
