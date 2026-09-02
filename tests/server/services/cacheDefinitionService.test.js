// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { CacheKeys, CacheTTL } from '../../../src/server/services/cache/cacheDefinitionService.js'

describe('cacheDefinitionService', () => {
  it('should expose stable ttl constants', () => {
    expect(CacheTTL).toEqual({
      SHORT: 60,
      MEDIUM: 300
    })
  })

  it('should build cache keys by responsibility', () => {
    expect(CacheKeys.categoriesSimple()).toBe('categories:simple:0')
    expect(CacheKeys.categoriesSimple(2)).toBe('categories:simple:2')
    expect(CacheKeys.data(3)).toBe('data:level:3')
    expect(CacheKeys.search(1, 'git', 10)).toBe('search:1:git:10')
  })
})
