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

  it('tracks stats on an isolated instance without depending on the singleton cache', () => {
    cache.set('alpha', 1)
    cache.set('beta', { ok: true })
    expect(cache.get('alpha')).toBe(1)
    expect(cache.get('beta')).toEqual({ ok: true })
    expect(cache.get('missing')).toBeUndefined()
    expect(cache.del('alpha')).toBe(1)

    expect(cache.getStats()).toEqual({
      hits: 2,
      misses: 1,
      sets: 2,
      keys: 1,
      hitRate: '66.67%'
    })
  })

  it('degrades gracefully when node-cache is full instead of throwing (round-30 M1)', () => {
    const small = new CacheRuntimeService({
      maxKeys: 2,
      stdTTL: 60,
      checkperiod: 0,
      useClones: false
    })

    expect(small.set('a', 1)).toBe(true)
    expect(small.set('b', 2)).toBe(true)
    // 满载：node-cache 抛 ECACHEFULL，此处应降级返回 false，不向上抛
    expect(small.set('c', 3)).toBe(false)

    expect(small.get('a')).toBe(1)
    expect(small.get('b')).toBe(2)
    expect(small.get('c')).toBeUndefined()
    expect(small.getStats().keys).toBe(2)
  })
})
