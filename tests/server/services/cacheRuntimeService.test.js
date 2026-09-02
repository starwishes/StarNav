// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

const { CacheRuntimeService } =
  await import('../../../src/server/services/cache/cacheRuntimeService.js')

describe('CacheRuntimeService', () => {
  let cache

  beforeEach(() => {
    cache = new CacheRuntimeService({
      stdTTL: 60,
      checkperiod: 0,
      useClones: false
    })
  })

  it('starts with empty stats and reports a zero hit rate', () => {
    expect(cache.getStats()).toEqual({
      hits: 0,
      misses: 0,
      sets: 0,
      keys: 0,
      hitRate: '0%'
    })
  })

  it('tracks stats on an isolated instance without depending on the singleton cache', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true })

    cache.set('alpha', 1)
    expect(cache.get('alpha')).toBe(1)
    expect(cache.get('missing')).toBeUndefined()
    expect(await cache.getOrSet('beta', fetchFn)).toEqual({ ok: true })
    expect(await cache.getOrSet('beta', fetchFn)).toEqual({ ok: true })
    expect(cache.del('alpha')).toBe(1)

    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(cache.getStats()).toEqual({
      hits: 2,
      misses: 2,
      sets: 2,
      keys: 1,
      hitRate: '50.00%'
    })
  })
})
