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
  invalidateBookmarkCaches: vi.fn()
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

const { bookmarkMutationService } =
  await import('../../../src/server/services/bookmark/bookmarkMutationService.js')

describe('BookmarkMutationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should replace all bookmark data in a single transaction', () => {
    const run = vi.fn()
    const prepare = vi.fn(() => ({ run }))
    const db = {
      prepare,
      transaction: vi.fn((callback) => callback)
    }

    mocks.getDb.mockReturnValue(db)

    const result = bookmarkMutationService.saveData('alice', {
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
    expect(result).toBe(true)
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

    const result = bookmarkMutationService.saveData('alice', {
      categories: [],
      items: []
    })

    expect(result).toBe(false)
    expect(mocks.invalidateBookmarkCaches).not.toHaveBeenCalled()
    expect(mocks.forceCheckpoint).not.toHaveBeenCalled()
    expect(mocks.loggerError).toHaveBeenCalledWith('数据保存失败', error)
  })

  it('should invalidate caches after successful click tracking', () => {
    const item = { id: 3, clickCount: 1 }
    mocks.bookmarkTrackClick.mockReturnValue(item)

    const result = bookmarkMutationService.trackClick('3')

    expect(mocks.bookmarkTrackClick).toHaveBeenCalledWith('3')
    expect(mocks.invalidateBookmarkCaches).toHaveBeenCalled()
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

    expect(bookmarkMutationService.addItem('alice', { name: 'GitHub' })).toBe(newItem)
    expect(bookmarkMutationService.updateItem('alice', '4', { name: 'Updated' })).toBe(updatedItem)
    expect(bookmarkMutationService.moveItem('alice', '4', 2, 1)).toEqual({ id: 4, categoryId: 2 })
    expect(bookmarkMutationService.batchMoveItems('alice', [4], 2)).toEqual([
      { id: 4, categoryId: 2 }
    ])
    expect(bookmarkMutationService.batchDeleteItems('alice', [4])).toBe(1)
    expect(bookmarkMutationService.deleteItem('alice', '4')).toBe(true)
    expect(bookmarkMutationService.addCategory('alice', { name: 'Dev' })).toEqual({ id: 8 })
    expect(
      bookmarkMutationService.updateCategory('alice', '8', { name: 'Updated category' })
    ).toEqual({
      id: 8,
      name: 'Updated category'
    })
    expect(bookmarkMutationService.reorderCategories('alice', [8])).toEqual([
      { id: 8, sortOrder: 0 }
    ])
    expect(bookmarkMutationService.deleteCategory('alice', '8')).toEqual({
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
    expect(bookmarkMutationService.addItem('alice', { name: 'Missing' })).toBeNull()
    expect(bookmarkMutationService.updateItem('alice', '99', { name: 'Missing' })).toBeNull()
    expect(bookmarkMutationService.moveItem('alice', '99', 2, 0)).toBeNull()
    expect(bookmarkMutationService.batchMoveItems('alice', [99], 2)).toEqual([])
    expect(bookmarkMutationService.batchDeleteItems('alice', [99])).toBe(0)
    expect(bookmarkMutationService.deleteItem('alice', '99')).toBe(false)
    expect(bookmarkMutationService.addCategory('alice', { name: 'Missing' })).toBeNull()
    expect(bookmarkMutationService.updateCategory('alice', '99', { name: 'Missing' })).toBeNull()
    expect(bookmarkMutationService.reorderCategories('alice', [99])).toEqual([])
    expect(bookmarkMutationService.deleteCategory('alice', '99')).toBeNull()
    expect(mocks.invalidateBookmarkCaches).not.toHaveBeenCalled()
  })
})
