import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/services/bookmark/bookmarkMutationService.js', () => ({
  bookmarkMutationService: {
    saveData: vi.fn(),
    trackClick: vi.fn(),
    addItem: vi.fn(),
    addCategory: vi.fn(),
    updateCategory: vi.fn(),
    reorderCategories: vi.fn(),
    deleteCategory: vi.fn(),
    updateItem: vi.fn(),
    moveItem: vi.fn(),
    batchMoveItems: vi.fn(),
    batchDeleteItems: vi.fn(),
    deleteItem: vi.fn()
  }
}))

vi.mock('../../../src/server/utils/validators.js', () => ({
  validators: {
    isValidUrl: vi.fn()
  }
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: {
    info: vi.fn()
  }
}))

const { bookmarkCommandService } =
  await import('../../../src/server/services/bookmark/bookmarkCommandService.js')
const { bookmarkMutationService } =
  await import('../../../src/server/services/bookmark/bookmarkMutationService.js')
const { validators } = await import('../../../src/server/utils/validators.js')
const { logger } = await import('../../../src/server/utils/logger.js')

describe('BookmarkCommandService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    validators.isValidUrl.mockReturnValue(true)
  })

  it('should reject bulk saves without an allowed action', () => {
    expect(() => {
      bookmarkCommandService.saveData('alice', {
        categories: [],
        items: []
      })
    }).toThrow('POST /data 仅用于全量导入/清理/替换')
    expect(bookmarkMutationService.saveData).not.toHaveBeenCalled()
  })

  it('should normalize bulk save payloads for bulk import action', () => {
    bookmarkMutationService.saveData.mockReturnValue(true)

    const result = bookmarkCommandService.saveData('alice', {
      content: {
        categories: [{ id: 1, name: 'Dev', level: 0 }],
        items: [{ id: 2, name: 'GitHub', url: 'https://github.com', categoryId: 1, level: 0 }],
        action: 'import'
      }
    })

    expect(bookmarkMutationService.saveData).toHaveBeenCalledWith('alice', {
      categories: [{ id: 1, name: 'Dev', level: 0, parentId: null }],
      items: [
        {
          id: 2,
          name: 'GitHub',
          url: 'https://github.com',
          categoryId: 1,
          level: 0,
          pinned: false,
          private: false
        }
      ]
    })
    expect(logger.info).toHaveBeenCalledWith('数据保存成功: alice (import)')
    expect(result).toEqual({ statusCode: 200, body: { success: true, message: '数据保存成功' } })
  })

  it('should return tracked bookmarks after tracking a click', () => {
    const item = { id: 3, clickCount: 1 }
    bookmarkMutationService.trackClick.mockReturnValue(item)

    const result = bookmarkCommandService.trackClick('3')

    expect(bookmarkMutationService.trackClick).toHaveBeenCalledWith('3')
    expect(result).toEqual({ item })
  })

  it('should validate URLs before adding bookmarks', () => {
    validators.isValidUrl.mockReturnValue(false)

    expect(() => {
      bookmarkCommandService.addBookmark('alice', {
        name: 'Invalid',
        url: 'invalid',
        categoryId: 1
      })
    }).toThrow('无效的 URL 格式')

    expect(bookmarkMutationService.addItem).not.toHaveBeenCalled()
  })

  it('should translate duplicate bookmark errors into conflict errors', () => {
    bookmarkMutationService.addItem.mockImplementation(() => {
      throw new Error('unique constraint failed')
    })

    expect(() => {
      bookmarkCommandService.addBookmark('alice', {
        name: 'GitHub',
        url: 'https://github.com',
        categoryId: 1
      })
    }).toThrow('该 URL 书签已存在')
  })

  it('should trim names and normalize category payload defaults', () => {
    const category = { id: 9, name: 'Dev' }
    bookmarkMutationService.addCategory.mockReturnValue(category)

    const result = bookmarkCommandService.createCategory('alice', {
      name: ' Dev ',
      parentId: '12'
    })

    expect(bookmarkMutationService.addCategory).toHaveBeenCalledWith('alice', {
      name: 'Dev',
      icon: '',
      level: 0,
      parentId: 12
    })
    expect(result).toEqual({ item: category })
  })

  it('should normalize category updates after successful mutation', () => {
    const category = { id: 9, name: 'Updated Dev', parentId: null }
    bookmarkMutationService.updateCategory.mockReturnValue(category)

    const result = bookmarkCommandService.updateCategory('alice', '9', {
      name: ' Updated Dev ',
      parentId: ''
    })

    expect(bookmarkMutationService.updateCategory).toHaveBeenCalledWith('alice', '9', {
      name: 'Updated Dev',
      parentId: null
    })
    expect(result).toEqual({ item: category })
  })

  it('should reorder categories through the incremental reorder command', () => {
    const categories = [{ id: 3 }, { id: 1 }, { id: 2 }]
    bookmarkMutationService.reorderCategories.mockReturnValue(categories)

    const result = bookmarkCommandService.reorderCategories('alice', {
      orderedIds: ['3', '1', '2']
    })

    expect(bookmarkMutationService.reorderCategories).toHaveBeenCalledWith('alice', [3, 1, 2])
    expect(result).toEqual({ categories })
  })

  it('should update bookmarks after successful mutation', () => {
    const item = { id: 4, name: 'Updated', pinned: true }
    bookmarkMutationService.updateItem.mockReturnValue(item)

    const result = bookmarkCommandService.updateBookmark('alice', '4', {
      name: 'Updated',
      pinned: true
    })

    expect(bookmarkMutationService.updateItem).toHaveBeenCalledWith('alice', '4', {
      name: 'Updated',
      pinned: true
    })
    expect(result).toEqual({ item })
  })

  it('should move bookmarks through the incremental move command', () => {
    const item = { id: 4, categoryId: 2, sortOrder: 1 }
    bookmarkMutationService.moveItem.mockReturnValue(item)

    const result = bookmarkCommandService.moveBookmark('alice', '4', {
      categoryId: '2',
      targetIndex: '1'
    })

    expect(bookmarkMutationService.moveItem).toHaveBeenCalledWith('alice', '4', 2, 1)
    expect(result).toEqual({ item })
  })

  it('should batch move and delete bookmarks through incremental commands', () => {
    const movedItems = [
      { id: 4, categoryId: 2 },
      { id: 5, categoryId: 2 }
    ]
    bookmarkMutationService.batchMoveItems.mockReturnValue(movedItems)
    bookmarkMutationService.batchDeleteItems.mockReturnValue(2)

    const moveResult = bookmarkCommandService.batchMoveBookmarks('alice', {
      ids: ['4', '5'],
      categoryId: '2'
    })
    const deleteResult = bookmarkCommandService.batchDeleteBookmarks('alice', {
      ids: ['4', '5']
    })

    expect(bookmarkMutationService.batchMoveItems).toHaveBeenCalledWith('alice', [4, 5], 2)
    expect(bookmarkMutationService.batchDeleteItems).toHaveBeenCalledWith('alice', [4, 5])
    expect(moveResult).toEqual({ count: 2, items: movedItems })
    expect(deleteResult).toEqual({ count: 2 })
  })

  it('should return a category delete success message', () => {
    bookmarkMutationService.deleteCategory.mockReturnValue({ id: 7, targetCategoryId: 0 })

    const result = bookmarkCommandService.deleteCategory('alice', '7')

    expect(bookmarkMutationService.deleteCategory).toHaveBeenCalledWith('alice', '7')
    expect(result).toEqual({ statusCode: 200, body: { success: true, message: '删除成功' } })
  })

  it('should return a delete success message', () => {
    bookmarkMutationService.deleteItem.mockReturnValue(true)

    const result = bookmarkCommandService.deleteBookmark('alice', '7')

    expect(bookmarkMutationService.deleteItem).toHaveBeenCalledWith('alice', '7')
    expect(result).toEqual({ statusCode: 200, body: { success: true, message: '删除成功' } })
  })
})
