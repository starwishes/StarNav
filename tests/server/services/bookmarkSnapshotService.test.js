import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  bookmarkGetAll: vi.fn(),
  categoryGetAll: vi.fn(),
  hasCache: vi.fn(),
  getCache: vi.fn(),
  rebuildCache: vi.fn()
}))

vi.mock('../../../src/server/services/bookmark/bookmarkReadService.js', () => ({
  bookmarkReadService: {
    getAll: mocks.bookmarkGetAll
  }
}))

vi.mock('../../../src/server/services/bookmark/categoryReadService.js', () => ({
  categoryReadService: {
    getAll: mocks.categoryGetAll
  }
}))

vi.mock('../../../src/server/services/bookmark/cache.js', () => ({
  hasCache: mocks.hasCache,
  getCache: mocks.getCache,
  rebuildCache: mocks.rebuildCache
}))

const { bookmarkSnapshotService } =
  await import('../../../src/server/services/bookmark/bookmarkSnapshotService.js')

describe('BookmarkSnapshotService', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('should read live bookmark data in test mode without touching the snapshot cache', () => {
    process.env.NODE_ENV = 'test'
    const categories = [{ id: 1, level: 1 }]
    const items = [{ id: 2, categoryId: 1, level: 1 }]

    mocks.categoryGetAll.mockReturnValue(categories)
    mocks.bookmarkGetAll.mockReturnValue(items)

    const result = bookmarkSnapshotService.getData('1')

    expect(mocks.categoryGetAll).toHaveBeenCalledWith(1)
    expect(mocks.bookmarkGetAll).toHaveBeenCalledWith(1, new Set([1]))
    expect(mocks.hasCache).not.toHaveBeenCalled()
    expect(result).toEqual({ categories, items })
  })

  it('should rebuild and filter cached snapshots outside test mode', () => {
    process.env.NODE_ENV = 'production'
    const allCategories = [
      { id: 1, level: 0 },
      { id: 2, level: 2 }
    ]
    const allItems = [
      { id: 1, categoryId: 1, level: 0 },
      { id: 2, categoryId: 2, level: 2 },
      { id: 3, categoryId: 0, level: 0 }
    ]

    mocks.hasCache.mockReturnValue(false)
    mocks.categoryGetAll.mockReturnValue(allCategories)
    mocks.bookmarkGetAll.mockReturnValue(allItems)
    mocks.getCache.mockReturnValue({
      categories: allCategories,
      items: allItems
    })

    const result = bookmarkSnapshotService.getData(0)

    expect(mocks.categoryGetAll).toHaveBeenCalledWith(999)
    expect(mocks.bookmarkGetAll).toHaveBeenCalledWith(999)
    expect(mocks.rebuildCache).toHaveBeenCalledWith(allCategories, allItems)
    expect(result).toEqual({
      categories: [{ id: 1, level: 0 }],
      items: [
        { id: 1, categoryId: 1, level: 0 },
        { id: 3, categoryId: 0, level: 0 }
      ]
    })
  })

  it('should expose all categories for compatibility callers', () => {
    const categories = [{ id: 10, name: 'Dev' }]
    mocks.categoryGetAll.mockReturnValue(categories)

    const result = bookmarkSnapshotService.getCategories()

    expect(mocks.categoryGetAll).toHaveBeenCalledWith(999)
    expect(result).toBe(categories)
  })
})
