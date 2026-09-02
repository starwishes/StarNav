// @vitest-environment node
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

vi.mock('../../../src/server/services/bookmark/categoryReadService.js', () => ({
  categoryReadService: {
    exists: vi.fn()
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
const { categoryReadService } =
  await import('../../../src/server/services/bookmark/categoryReadService.js')
const { validators } = await import('../../../src/server/utils/validators.js')
const { logger } = await import('../../../src/server/utils/logger.js')
const { categoryCreateSchema, categoryUpdateSchema, dataSchema, validatePayload } =
  await import('../../../src/server/validation.js')

describe('BookmarkCommandService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    validators.isValidUrl.mockReturnValue(true)
    categoryReadService.exists.mockReturnValue(true)
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

  it('should reject bulk imports containing non-http(s) URLs', () => {
    expect(() => {
      bookmarkCommandService.saveData('alice', {
        categories: [],
        items: [{ id: 2, name: 'XSS', url: 'javascript:alert(1)', categoryId: 1 }],
        action: 'import'
      })
    }).toThrow('无效的 URL 格式')
    expect(bookmarkMutationService.saveData).not.toHaveBeenCalled()

    expect(() => {
      bookmarkCommandService.saveData('alice', {
        categories: [],
        items: [{ id: 3, name: 'Mail', url: 'mailto:test@example.com', categoryId: 1 }],
        action: 'import'
      })
    }).toThrow('无效的 URL 格式')
    expect(bookmarkMutationService.saveData).not.toHaveBeenCalled()
  })

  it('should reject creating a bookmark in a nonexistent category with a 400-style error', () => {
    categoryReadService.exists.mockReturnValue(false)

    expect(() => {
      bookmarkCommandService.addBookmark({
        name: 'GitHub',
        url: 'https://github.com',
        categoryId: 999
      })
    }).toThrow('分类不存在')
    expect(bookmarkMutationService.addItem).not.toHaveBeenCalled()
  })

  it('should normalize bulk save payloads for bulk import action', () => {
    bookmarkMutationService.saveData.mockReturnValue(true)

    const validatedPayload = validatePayload(
      dataSchema,
      {
        content: {
          categories: [{ id: 1, name: 'Dev', level: 0 }],
          items: [{ id: 2, name: 'GitHub', url: 'https://github.com', categoryId: 1, level: 0 }],
          action: 'import'
        }
      },
      '数据格式不正确'
    )
    const result = bookmarkCommandService.saveData('alice', validatedPayload)

    expect(bookmarkMutationService.saveData).toHaveBeenCalledWith({
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

    expect(bookmarkMutationService.trackClick).toHaveBeenCalledWith('3', 0)
    expect(result).toEqual({ item })
  })

  it('should validate URLs before adding bookmarks', () => {
    validators.isValidUrl.mockReturnValue(false)

    expect(() => {
      bookmarkCommandService.addBookmark({
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
      bookmarkCommandService.addBookmark({
        name: 'GitHub',
        url: 'https://github.com',
        categoryId: 1
      })
    }).toThrow('该 URL 书签已存在')
  })

  it('should trim names and normalize category payload defaults', () => {
    const category = { id: 9, name: 'Dev' }
    bookmarkMutationService.addCategory.mockReturnValue(category)

    const validatedPayload = validatePayload(
      categoryCreateSchema,
      {
        name: ' Dev ',
        parentId: '12'
      },
      '分类参数不正确'
    )
    const result = bookmarkCommandService.createCategory(validatedPayload)

    expect(bookmarkMutationService.addCategory).toHaveBeenCalledWith({
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

    const validatedPayload = validatePayload(
      categoryUpdateSchema,
      {
        name: ' Updated Dev ',
        parentId: ''
      },
      '分类更新参数不正确'
    )
    const result = bookmarkCommandService.updateCategory('9', validatedPayload)

    expect(bookmarkMutationService.updateCategory).toHaveBeenCalledWith('9', {
      name: 'Updated Dev',
      parentId: null
    })
    expect(result).toEqual({ item: category })
  })

  it('should reorder categories through the incremental reorder command', () => {
    const categories = [{ id: 3 }, { id: 1 }, { id: 2 }]
    bookmarkMutationService.reorderCategories.mockReturnValue(categories)

    const result = bookmarkCommandService.reorderCategories({
      orderedIds: ['3', '1', '2']
    })

    expect(bookmarkMutationService.reorderCategories).toHaveBeenCalledWith([3, 1, 2])
    expect(result).toEqual({ categories })
  })

  it('should update bookmarks after successful mutation', () => {
    const item = { id: 4, name: 'Updated', pinned: true }
    bookmarkMutationService.updateItem.mockReturnValue(item)

    const result = bookmarkCommandService.updateBookmark('4', {
      name: 'Updated',
      pinned: true
    })

    expect(bookmarkMutationService.updateItem).toHaveBeenCalledWith('4', {
      name: 'Updated',
      pinned: true
    })
    expect(result).toEqual({ item })
  })

  it('should move bookmarks through the incremental move command', () => {
    const item = { id: 4, categoryId: 2, sortOrder: 1 }
    bookmarkMutationService.moveItem.mockReturnValue(item)

    const result = bookmarkCommandService.moveBookmark('4', {
      categoryId: '2',
      targetIndex: '1'
    })

    expect(bookmarkMutationService.moveItem).toHaveBeenCalledWith('4', 2, 1)
    expect(result).toEqual({ item })
  })

  it('should batch move and delete bookmarks through incremental commands', () => {
    const movedItems = [
      { id: 4, categoryId: 2 },
      { id: 5, categoryId: 2 }
    ]
    bookmarkMutationService.batchMoveItems.mockReturnValue(movedItems)
    bookmarkMutationService.batchDeleteItems.mockReturnValue(2)

    const moveResult = bookmarkCommandService.batchMoveBookmarks({
      ids: ['4', '5'],
      categoryId: '2'
    })
    const deleteResult = bookmarkCommandService.batchDeleteBookmarks({
      ids: ['4', '5']
    })

    expect(bookmarkMutationService.batchMoveItems).toHaveBeenCalledWith([4, 5], 2)
    expect(bookmarkMutationService.batchDeleteItems).toHaveBeenCalledWith([4, 5])
    expect(moveResult).toEqual({ count: 2, items: movedItems })
    expect(deleteResult).toEqual({ count: 2 })
  })

  it('should return a category delete success message', () => {
    bookmarkMutationService.deleteCategory.mockReturnValue({ id: 7, targetCategoryId: 0 })

    const result = bookmarkCommandService.deleteCategory('7')

    expect(bookmarkMutationService.deleteCategory).toHaveBeenCalledWith('7')
    expect(result).toEqual({ statusCode: 200, body: { success: true, message: '删除成功' } })
  })

  it('should return a delete success message', () => {
    bookmarkMutationService.deleteItem.mockReturnValue(true)

    const result = bookmarkCommandService.deleteBookmark('7')

    expect(bookmarkMutationService.deleteItem).toHaveBeenCalledWith('7')
    expect(result).toEqual({ statusCode: 200, body: { success: true, message: '删除成功' } })
  })
})
