// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  checkUrl: vi.fn(),
  search: vi.fn(),
  hasCache: vi.fn(),
  getCache: vi.fn()
}))

vi.mock('../../../src/server/services/bookmark/bookmarkReadService.js', () => ({
  bookmarkReadService: {
    checkUrl: mocks.checkUrl
  }
}))

vi.mock('../../../src/server/services/bookmark/SearchEngine.js', () => ({
  searchBookmarks: (...args) => mocks.search(...args)
}))

vi.mock('../../../src/server/services/bookmark/cache.js', () => ({
  hasCache: mocks.hasCache,
  getCache: mocks.getCache
}))

const { bookmarkLookupService } =
  await import('../../../src/server/services/bookmark/bookmarkLookupService.js')

describe('BookmarkLookupService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return cached bookmarks when the snapshot cache already has the URL', () => {
    const item = { id: 1, url: 'https://cached.test', categoryId: 7, level: 1 }
    mocks.hasCache.mockReturnValue(true)
    mocks.getCache.mockReturnValue({
      items: [item],
      categories: [{ id: 7, level: 1 }]
    })

    const result = bookmarkLookupService.checkUrlItem(item.url, 1)

    expect(mocks.checkUrl).not.toHaveBeenCalled()
    expect(result).toBe(item)
  })

  it('should treat uncategorized cached bookmarks as visible items', () => {
    const item = { id: 11, url: 'https://uncategorized.test', categoryId: 0, level: 0 }
    mocks.hasCache.mockReturnValue(true)
    mocks.getCache.mockReturnValue({
      items: [item],
      categories: []
    })

    const result = bookmarkLookupService.checkUrlItem(item.url, 0)

    expect(mocks.checkUrl).not.toHaveBeenCalled()
    expect(result).toBe(item)
  })

  it('should fall back to the bookmark manager on cache miss', () => {
    const item = { id: 2, url: 'https://db.test' }
    mocks.hasCache.mockReturnValue(false)
    mocks.checkUrl.mockReturnValue(item)

    const result = bookmarkLookupService.checkUrlItem(item.url, 1)

    expect(mocks.checkUrl).toHaveBeenCalledWith(item.url, 1)
    expect(result).toBe(item)
  })

  it('should ignore cached bookmarks above the current access level', () => {
    const hiddenItem = { id: 4, url: 'https://hidden.test', categoryId: 9, level: 2 }
    mocks.hasCache.mockReturnValue(true)
    mocks.getCache.mockReturnValue({
      items: [hiddenItem],
      categories: [{ id: 9, level: 2 }]
    })
    mocks.checkUrl.mockReturnValue(null)

    const result = bookmarkLookupService.checkUrlItem(hiddenItem.url, 1)

    expect(mocks.checkUrl).toHaveBeenCalledWith(hiddenItem.url, 1)
    expect(result).toBeNull()
  })

  it('should delegate bookmark searches to the search engine', () => {
    const items = [{ id: 3, name: 'GitHub' }]
    mocks.search.mockReturnValue(items)

    const result = bookmarkLookupService.searchItems('git', 5, 1)

    expect(mocks.search).toHaveBeenCalledWith('git', 1, 5)
    expect(result).toBe(items)
  })
})
