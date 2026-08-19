import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/services/bookmark/bookmarkSnapshotService.js', () => ({
  bookmarkSnapshotService: {
    getData: vi.fn(),
    getCategories: vi.fn()
  }
}))

vi.mock('../../../src/server/services/bookmark/bookmarkLookupService.js', () => ({
  bookmarkLookupService: {
    searchItems: vi.fn(),
    checkUrlItem: vi.fn()
  }
}))

vi.mock('../../../src/server/services/cache/cacheService.js', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn()
  }
}))

const { bookmarkQueryService } =
  await import('../../../src/server/services/bookmark/bookmarkQueryService.js')
const { bookmarkSnapshotService } =
  await import('../../../src/server/services/bookmark/bookmarkSnapshotService.js')
const { bookmarkLookupService } =
  await import('../../../src/server/services/bookmark/bookmarkLookupService.js')
const cache = (await import('../../../src/server/services/cache/cacheService.js')).default

describe('BookmarkQueryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reuse cached data snapshots by level', () => {
    const cachedData = { categories: [], items: [] }
    cache.get.mockReturnValue(cachedData)

    const result = bookmarkQueryService.getData(1)

    expect(cache.get).toHaveBeenCalledWith('data:level:1')
    expect(bookmarkSnapshotService.getData).not.toHaveBeenCalled()
    expect(result).toEqual(cachedData)
  })

  it('should fetch and cache data snapshots on cache miss', () => {
    const data = { categories: [{ id: 1 }], items: [{ id: 2 }] }
    cache.get.mockReturnValue(undefined)
    bookmarkSnapshotService.getData.mockReturnValue(data)

    const result = bookmarkQueryService.getData('2')

    expect(bookmarkSnapshotService.getData).toHaveBeenCalledWith(2)
    expect(cache.set).toHaveBeenCalledWith('data:level:2', data, 300)
    expect(result).toEqual(data)
  })

  it('should fetch and cache search results with normalized limit', () => {
    const items = [{ id: 1, name: 'GitHub' }]
    cache.get.mockReturnValue(undefined)
    bookmarkLookupService.searchItems.mockReturnValue(items)

    const result = bookmarkQueryService.searchBookmarks('alice', 1, 'git', '0')

    expect(bookmarkLookupService.searchItems).toHaveBeenCalledWith('alice', 'git', 10, 1)
    expect(cache.set).toHaveBeenCalledWith('search:1:git:10', items, 60)
    expect(result).toEqual({ items })
  })

  it('should clamp search limit to 100 and normalize keyword in cache key', () => {
    const items = []
    cache.get.mockReturnValue(undefined)
    bookmarkLookupService.searchItems.mockReturnValue(items)

    bookmarkQueryService.searchBookmarks('alice', 1, '  GitHub  ', '9999')

    expect(bookmarkLookupService.searchItems).toHaveBeenCalledWith('alice', 'github', 100, 1)
    expect(cache.set).toHaveBeenCalledWith('search:1:github:100', items, 60)
  })

  it('should truncate overly long keywords so cache keys stay bounded', () => {
    const items = []
    cache.get.mockReturnValue(undefined)
    bookmarkLookupService.searchItems.mockReturnValue(items)

    const longKeyword = 'x'.repeat(5000)
    bookmarkQueryService.searchBookmarks('alice', 1, longKeyword, '5')

    expect(bookmarkLookupService.searchItems).toHaveBeenCalledWith('alice', 'x'.repeat(100), 5, 1)
    expect(cache.set).toHaveBeenCalledWith(`search:1:${'x'.repeat(100)}:5`, items, 60)
  })

  it('should fetch and cache simple categories', () => {
    const categories = [{ id: 1, name: 'Dev' }]
    cache.get.mockReturnValue(undefined)
    bookmarkSnapshotService.getCategories.mockReturnValue(categories)

    const result = bookmarkQueryService.getSimpleCategories(2)

    expect(cache.get).toHaveBeenCalledWith('categories:simple:2')
    expect(bookmarkSnapshotService.getCategories).toHaveBeenCalledWith(2)
    expect(cache.set).toHaveBeenCalledWith('categories:simple:2', categories, 300)
    expect(result).toEqual({ categories })
  })

  it('should return bookmark existence payload', () => {
    const item = { id: 1, url: 'https://example.com' }
    bookmarkLookupService.checkUrlItem.mockReturnValue(item)

    const result = bookmarkQueryService.checkBookmark('alice', 1, 'https://example.com')

    expect(bookmarkLookupService.checkUrlItem).toHaveBeenCalledWith(
      'alice',
      'https://example.com',
      1
    )
    expect(result).toEqual({
      exists: true,
      item
    })
  })

  it('should reject empty bookmark checks', () => {
    expect(() => {
      bookmarkQueryService.checkBookmark('alice', 1, '')
    }).toThrow('URL 不能为空')
  })
})
