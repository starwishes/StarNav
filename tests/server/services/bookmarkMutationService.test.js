// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  forceCheckpoint: vi.fn(),
  backupDatabase: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
  bookmarkTrackClick: vi.fn(),
  bookmarkDelete: vi.fn(),
  bookmarkUpdate: vi.fn(),
  bookmarkMove: vi.fn(),
  bookmarkBatchMove: vi.fn(),
  bookmarkBatchDelete: vi.fn(),
  bookmarkAdd: vi.fn(),
  bookmarkBulkInsert: vi.fn(),
  categoryAdd: vi.fn(),
  categoryUpdate: vi.fn(),
  categoryReorder: vi.fn(),
  categoryDelete: vi.fn(),
  categoryBulkInsert: vi.fn(),
  invalidateBookmarkCaches: vi.fn(),
  patchItemClickInCache: vi.fn()
}))

vi.mock('../../../src/server/services/database/database.js', () => ({
  getDb: mocks.getDb,
  forceCheckpoint: mocks.forceCheckpoint,
  backupDatabase: mocks.backupDatabase
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: {
    info: mocks.loggerInfo,
    error: mocks.loggerError
  }
}))

vi.mock('../../../src/server/services/bookmark/bookmarkWriteService.js', () => ({
  bookmarkWriteService: {
    trackClick: mocks.bookmarkTrackClick,
    delete: mocks.bookmarkDelete,
    update: mocks.bookmarkUpdate,
    move: mocks.bookmarkMove,
    batchMove: mocks.bookmarkBatchMove,
    batchDelete: mocks.bookmarkBatchDelete,
    add: mocks.bookmarkAdd,
    bulkInsert: mocks.bookmarkBulkInsert
  }
}))

vi.mock('../../../src/server/services/bookmark/categoryWriteService.js', () => ({
  categoryWriteService: {
    add: mocks.categoryAdd,
    update: mocks.categoryUpdate,
    reorder: mocks.categoryReorder,
    delete: mocks.categoryDelete,
    bulkInsert: mocks.categoryBulkInsert
  }
}))

vi.mock('../../../src/server/services/cache/cacheInvalidationService.js', () => ({
  invalidateBookmarkCaches: mocks.invalidateBookmarkCaches
}))

vi.mock('../../../src/server/services/bookmark/cache.js', () => ({
  patchItemClickInCache: mocks.patchItemClickInCache
}))

const { bookmarkMutationService } =
  await import('../../../src/server/services/bookmark/bookmarkMutationService.js')
const { resetBackupThrottle } =
  await import('../../../src/server/services/database/backupThrottle.js')

describe('BookmarkMutationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetBackupThrottle()
    mocks.backupDatabase.mockReturnValue({ success: true })
  })

  it('should replace all bookmark data in a single transaction', () => {
    const run = vi.fn()
    const prepare = vi.fn(() => ({ run }))
    const db = {
      prepare,
      transaction: vi.fn((callback) => callback)
    }

    mocks.getDb.mockReturnValue(db)

    const result = bookmarkMutationService.saveData({
      categories: [{ id: 1 }],
      items: [{ id: 2 }]
    })

    expect(mocks.backupDatabase).toHaveBeenCalled()
    expect(prepare).toHaveBeenCalledWith('DELETE FROM items')
    expect(prepare).toHaveBeenCalledWith('DELETE FROM categories')
    expect(mocks.categoryBulkInsert).toHaveBeenCalledWith([{ id: 1 }], db)
    expect(mocks.bookmarkBulkInsert).toHaveBeenCalledWith([{ id: 2 }], db)
    expect(mocks.invalidateBookmarkCaches).toHaveBeenCalled()
    expect(mocks.forceCheckpoint).toHaveBeenCalled()
    expect(mocks.loggerInfo).toHaveBeenCalledWith('数据保存成功: 1 分类, 1 书签')
    expect(result).toBeUndefined()
  })

  it('should report failed bulk saves without invalidating caches', () => {
    const error = new Error('boom')
    const db = {
      prepare: vi.fn(() => ({ run: vi.fn() })),
      transaction: vi.fn(() => () => {
        throw error
      })
    }

    mocks.getDb.mockReturnValue(db)

    // 失败时直接抛错（500），不再用布尔握手
    expect(() =>
      bookmarkMutationService.saveData({
        categories: [],
        items: []
      })
    ).toThrow('数据保存失败')
    expect(mocks.invalidateBookmarkCaches).not.toHaveBeenCalled()
    expect(mocks.forceCheckpoint).not.toHaveBeenCalled()
    expect(mocks.loggerError).toHaveBeenCalledWith('数据保存失败', error)
  })

  it('should narrow-invalidate caches after successful click tracking', () => {
    const item = { id: 3, clickCount: 2, lastVisited: '2026-07-26T00:00:00.000Z' }
    mocks.bookmarkTrackClick.mockReturnValue(item)
    mocks.patchItemClickInCache.mockReturnValue(true)

    const result = bookmarkMutationService.trackClick('3', 0)

    expect(mocks.bookmarkTrackClick).toHaveBeenCalledWith('3', 0)
    expect(mocks.patchItemClickInCache).toHaveBeenCalledWith(3, 2, '2026-07-26T00:00:00.000Z')
    expect(mocks.invalidateBookmarkCaches).toHaveBeenCalledWith(undefined, {
      includeSnapshot: false,
      includeSearch: false
    })
    expect(result).toBe(item)
  })

  it('should only invalidate caches for successful bookmark mutations', () => {
    const newItem = { id: 4 }
    const updatedItem = { id: 4, name: 'Updated' }

    mocks.bookmarkAdd.mockReturnValue(newItem)
    mocks.bookmarkUpdate.mockReturnValue(updatedItem)
    mocks.bookmarkMove.mockReturnValue({ id: 4, categoryId: 2 })
    mocks.bookmarkBatchMove.mockReturnValue([{ id: 4, categoryId: 2 }])
    mocks.bookmarkBatchDelete.mockReturnValue(1)
    mocks.bookmarkDelete.mockReturnValue(true)
    mocks.categoryAdd.mockReturnValue({ id: 8 })
    mocks.categoryUpdate.mockReturnValue({ id: 8, name: 'Updated category' })
    mocks.categoryReorder.mockReturnValue([{ id: 8, sortOrder: 0 }])
    mocks.categoryDelete.mockReturnValue({ id: 8, targetCategoryId: 0 })

    expect(bookmarkMutationService.addItem({ name: 'GitHub' })).toBe(newItem)
    expect(bookmarkMutationService.updateItem('4', { name: 'Updated' })).toBe(updatedItem)
    expect(bookmarkMutationService.moveItem('4', 2, 1)).toEqual({ id: 4, categoryId: 2 })
    expect(bookmarkMutationService.batchMoveItems([4], 2)).toEqual([{ id: 4, categoryId: 2 }])
    expect(bookmarkMutationService.batchDeleteItems([4])).toBe(1)
    expect(bookmarkMutationService.deleteItem('4')).toBe(true)
    expect(bookmarkMutationService.addCategory({ name: 'Dev' })).toEqual({ id: 8 })
    expect(bookmarkMutationService.updateCategory('8', { name: 'Updated category' })).toEqual({
      id: 8,
      name: 'Updated category'
    })
    expect(bookmarkMutationService.reorderCategories([8])).toEqual([{ id: 8, sortOrder: 0 }])
    expect(bookmarkMutationService.deleteCategory('8')).toEqual({
      id: 8,
      targetCategoryId: 0
    })
    expect(mocks.invalidateBookmarkCaches).toHaveBeenCalledTimes(10)
  })

  it('should preserve falsey mutation results without invalidating snapshots', () => {
    mocks.bookmarkTrackClick.mockReturnValue(null)
    mocks.bookmarkAdd.mockReturnValue(null)
    mocks.bookmarkUpdate.mockReturnValue(null)
    mocks.bookmarkMove.mockReturnValue(null)
    mocks.bookmarkBatchMove.mockReturnValue([])
    mocks.bookmarkBatchDelete.mockReturnValue(0)
    mocks.bookmarkDelete.mockReturnValue(false)
    mocks.categoryAdd.mockReturnValue(null)
    mocks.categoryUpdate.mockReturnValue(null)
    mocks.categoryReorder.mockReturnValue([])
    mocks.categoryDelete.mockReturnValue(null)

    expect(bookmarkMutationService.trackClick('99')).toBeNull()
    expect(bookmarkMutationService.addItem({ name: 'Missing' })).toBeNull()
    expect(bookmarkMutationService.updateItem('99', { name: 'Missing' })).toBeNull()
    expect(bookmarkMutationService.moveItem('99', 2, 0)).toBeNull()
    expect(bookmarkMutationService.batchMoveItems([99], 2)).toEqual([])
    expect(bookmarkMutationService.batchDeleteItems([99])).toBe(0)
    expect(bookmarkMutationService.deleteItem('99')).toBe(false)
    expect(bookmarkMutationService.addCategory({ name: 'Missing' })).toBeNull()
    expect(bookmarkMutationService.updateCategory('99', { name: 'Missing' })).toBeNull()
    expect(bookmarkMutationService.reorderCategories([99])).toEqual([])
    expect(bookmarkMutationService.deleteCategory('99')).toBeNull()
    expect(mocks.invalidateBookmarkCaches).not.toHaveBeenCalled()
  })
})
