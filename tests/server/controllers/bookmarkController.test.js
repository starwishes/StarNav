import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bookmarkController } from '../../../src/server/controllers/bookmarkController.js'
import { bookmarkQueryService } from '../../../src/server/services/bookmark/bookmarkQueryService.js'
import { bookmarkCommandService } from '../../../src/server/services/bookmark/bookmarkCommandService.js'

// Mock dependencies
vi.mock('../../../src/server/services/bookmark/bookmarkQueryService.js')
vi.mock('../../../src/server/services/bookmark/bookmarkCommandService.js')

describe('BookmarkController Unit Tests', () => {
  let req, res, next

  beforeEach(() => {
    req = {
      user: { username: 'testuser', level: 1 },
      body: {},
      query: {},
      params: {}
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    next = vi.fn()

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('getData', () => {
    it('应该委托读侧服务获取数据', async () => {
      const data = { success: true, data: { categories: [], items: [] } }
      bookmarkQueryService.getData.mockReturnValue(data)

      await bookmarkController.getData(req, res, next)

      expect(bookmarkQueryService.getData).toHaveBeenCalledWith(1)
      expect(res.json).toHaveBeenCalledWith(data)
    })
  })

  describe('searchBookmarks', () => {
    it('应该委托读侧服务搜索书签', async () => {
      req.query = { q: 'git', limit: '5' }
      const result = { success: true, items: [{ id: 1, name: 'GitHub' }] }
      bookmarkQueryService.searchBookmarks.mockReturnValue(result)

      await bookmarkController.searchBookmarks(req, res, next)

      expect(bookmarkQueryService.searchBookmarks).toHaveBeenCalledWith('testuser', 1, 'git', '5')
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('getSimpleCategories', () => {
    it('应该委托读侧服务获取分类简表', async () => {
      const result = { success: true, categories: [{ id: 1, name: 'Dev' }] }
      bookmarkQueryService.getSimpleCategories.mockReturnValue(result)

      await bookmarkController.getSimpleCategories(req, res, next)

      expect(bookmarkQueryService.getSimpleCategories).toHaveBeenCalledWith(1)
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('checkBookmark', () => {
    it('应该委托读侧服务检查 URL 是否已存在', async () => {
      req.query = { url: 'https://test.com' }
      const result = { success: true, exists: true, item: { id: 1 } }
      bookmarkQueryService.checkBookmark.mockReturnValue(result)

      await bookmarkController.checkBookmark(req, res, next)

      expect(bookmarkQueryService.checkBookmark).toHaveBeenCalledWith(
        'testuser',
        1,
        'https://test.com'
      )
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('addBookmark', () => {
    it('应该委托写侧服务添加书签', async () => {
      req.body = {
        name: 'Test',
        url: 'https://test.com',
        categoryId: 1
      }

      const result = { success: true, item: { id: 1, ...req.body } }
      bookmarkCommandService.addBookmark.mockReturnValue(result)

      await bookmarkController.addBookmark(req, res, next)

      expect(bookmarkCommandService.addBookmark).toHaveBeenCalledWith('testuser', req.body)
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('saveData', () => {
    it('应该委托写侧服务保存全量数据', async () => {
      req.body = { categories: [{ id: 1 }], items: [{ id: 2 }] }
      bookmarkCommandService.saveData.mockReturnValue({ success: true, message: '数据保存成功' })

      await bookmarkController.saveData(req, res, next)

      expect(bookmarkCommandService.saveData).toHaveBeenCalledWith('testuser', req.body)
      expect(res.json).toHaveBeenCalledWith({ success: true, message: '数据保存成功' })
    })
  })

  describe('trackClick', () => {
    it('应该委托写侧服务记录点击', async () => {
      req.params = { id: '123' }
      const result = { success: true, item: { id: 123, clickCount: 2 } }
      bookmarkCommandService.trackClick.mockReturnValue(result)

      await bookmarkController.trackClick(req, res, next)

      expect(bookmarkCommandService.trackClick).toHaveBeenCalledWith('123')
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('createCategory', () => {
    it('应该委托写侧服务创建分类', async () => {
      req.body = { name: 'Dev' }
      const result = { success: true, item: { id: 1, name: 'Dev' } }
      bookmarkCommandService.createCategory.mockReturnValue(result)

      await bookmarkController.createCategory(req, res, next)

      expect(bookmarkCommandService.createCategory).toHaveBeenCalledWith('testuser', req.body)
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('updateCategory', () => {
    it('应该委托写侧服务更新分类', async () => {
      req.params = { id: '9' }
      req.body = { name: 'Updated Dev' }
      const result = { success: true, item: { id: 9, name: 'Updated Dev' } }
      bookmarkCommandService.updateCategory.mockReturnValue(result)

      await bookmarkController.updateCategory(req, res, next)

      expect(bookmarkCommandService.updateCategory).toHaveBeenCalledWith('testuser', '9', req.body)
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('reorderCategories', () => {
    it('应该委托写侧服务重排分类', async () => {
      req.body = { orderedIds: [3, 1, 2] }
      const result = { success: true, data: { categories: [{ id: 3 }, { id: 1 }, { id: 2 }] } }
      bookmarkCommandService.reorderCategories.mockReturnValue(result)

      await bookmarkController.reorderCategories(req, res, next)

      expect(bookmarkCommandService.reorderCategories).toHaveBeenCalledWith('testuser', req.body)
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('updateBookmark', () => {
    it('应该委托写侧服务更新书签', async () => {
      req.params = { id: '123' }
      req.body = { name: 'Updated' }
      const result = { success: true, item: { id: 123, name: 'Updated' } }
      bookmarkCommandService.updateBookmark.mockReturnValue(result)

      await bookmarkController.updateBookmark(req, res, next)

      expect(bookmarkCommandService.updateBookmark).toHaveBeenCalledWith(
        'testuser',
        '123',
        req.body
      )
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('moveBookmark', () => {
    it('应该委托写侧服务移动书签', async () => {
      req.params = { id: '123' }
      req.body = { categoryId: 2, targetIndex: 1 }
      const result = { success: true, data: { item: { id: 123, categoryId: 2 } } }
      bookmarkCommandService.moveBookmark.mockReturnValue(result)

      await bookmarkController.moveBookmark(req, res, next)

      expect(bookmarkCommandService.moveBookmark).toHaveBeenCalledWith('testuser', '123', req.body)
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('batch bookmark mutations', () => {
    it('应该委托写侧服务批量移动和删除书签', async () => {
      req.body = { ids: [1, 2], categoryId: 9 }
      const moveResult = { success: true, data: { count: 2 } }
      const deleteResult = { success: true, data: { count: 2 } }
      bookmarkCommandService.batchMoveBookmarks.mockReturnValue(moveResult)
      bookmarkCommandService.batchDeleteBookmarks.mockReturnValue(deleteResult)

      await bookmarkController.batchMoveBookmarks(req, res, next)
      expect(bookmarkCommandService.batchMoveBookmarks).toHaveBeenCalledWith('testuser', req.body)
      expect(res.json).toHaveBeenCalledWith(moveResult)

      req.body = { ids: [1, 2] }
      await bookmarkController.batchDeleteBookmarks(req, res, next)
      expect(bookmarkCommandService.batchDeleteBookmarks).toHaveBeenCalledWith('testuser', req.body)
      expect(res.json).toHaveBeenCalledWith(deleteResult)
    })
  })

  describe('deleteCategory', () => {
    it('应该委托写侧服务删除分类', async () => {
      req.params = { id: '9' }
      bookmarkCommandService.deleteCategory.mockReturnValue({ success: true, message: '删除成功' })

      await bookmarkController.deleteCategory(req, res, next)

      expect(bookmarkCommandService.deleteCategory).toHaveBeenCalledWith('testuser', '9')
      expect(res.json).toHaveBeenCalledWith({ success: true, message: '删除成功' })
    })
  })

  describe('deleteBookmark', () => {
    it('应该委托写侧服务删除书签', async () => {
      req.params = { id: '123' }
      bookmarkCommandService.deleteBookmark.mockReturnValue({ success: true, message: '删除成功' })

      await bookmarkController.deleteBookmark(req, res, next)

      expect(bookmarkCommandService.deleteBookmark).toHaveBeenCalledWith('testuser', '123')
      expect(res.json).toHaveBeenCalledWith({ success: true, message: '删除成功' })
    })
  })
})
