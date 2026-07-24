import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { bookmarkReadService } from '../../../src/server/services/bookmark/bookmarkReadService.js'
import { bookmarkWriteService } from '../../../src/server/services/bookmark/bookmarkWriteService.js'
import { categoryReadService } from '../../../src/server/services/bookmark/categoryReadService.js'
import { categoryWriteService } from '../../../src/server/services/bookmark/categoryWriteService.js'
import { getDb, closeDb } from '../../../src/server/services/database/database.js'

let urlSequence = 0
const createUniqueUrl = (label = 'bookmark') =>
  `https://${label}-${process.pid}-${Date.now()}-${urlSequence++}.test`
const resetBookmarkTables = () => {
  const db = getDb()
  db.exec('DELETE FROM items')
  db.exec('DELETE FROM categories')
}

describe('bookmarkRead/WriteService 单元测试', () => {
  let testCategoryId

  beforeEach(() => {
    resetBookmarkTables()

    const category = categoryWriteService.add({
      name: '测试分类',
      icon: '📝',
      level: 0
    })
    testCategoryId = category.id
  })

  afterEach(() => {
    resetBookmarkTables()
    closeDb()
  })

  describe('add() - 添加书签', () => {
    it('应该成功添加书签', () => {
      const url = createUniqueUrl('github')
      const bookmark = bookmarkWriteService.add({
        name: 'GitHub',
        url,
        description: '代码托管平台',
        categoryId: testCategoryId,
        level: 0
      })

      expect(bookmark).toBeDefined()
      expect(bookmark.id).toBeGreaterThan(0)
      expect(bookmark.name).toBe('GitHub')
      expect(bookmark.url).toBe(url)
      expect(bookmark.categoryId).toBe(testCategoryId)
      expect(bookmark.pinned).toBe(false)
      expect(bookmark.clickCount).toBe(0)
    })

    it('应该为未命名书签设置默认名称', () => {
      const url = createUniqueUrl('example')
      const bookmark = bookmarkWriteService.add({
        url,
        categoryId: testCategoryId
      })

      expect(bookmark).toBeDefined()
      expect(bookmark.name).toBe('Untitled')
      expect(bookmark.url).toBe(url)
    })
  })

  describe('update() - 更新书签', () => {
    it('应该成功更新书签信息', () => {
      const url = createUniqueUrl('github')
      const bookmark = bookmarkWriteService.add({
        name: 'Old Name',
        url,
        categoryId: testCategoryId
      })

      const updated = bookmarkWriteService.update(bookmark.id, {
        name: 'New Name',
        description: 'Updated description'
      })

      expect(updated).toBeDefined()
      expect(updated.name).toBe('New Name')
      expect(updated.description).toBe('Updated description')
      expect(updated.url).toBe(url) // 未修改的字段保持不变
    })

    it('当书签不存在时应该返回 null', () => {
      const result = bookmarkWriteService.update(99999, { name: 'Test' })
      expect(result).toBeNull()
    })

    it('当没有提供更新字段时应该返回 null', () => {
      const url = createUniqueUrl('test')
      const bookmark = bookmarkWriteService.add({
        name: 'Test',
        url,
        categoryId: testCategoryId
      })

      const result = bookmarkWriteService.update(bookmark.id, {})
      expect(result).toBeNull()
    })
  })

  describe('delete() - 删除书签', () => {
    it('应该成功删除书签', () => {
      const url = createUniqueUrl('delete')
      const bookmark = bookmarkWriteService.add({
        name: 'To Delete',
        url,
        categoryId: testCategoryId
      })

      const success = bookmarkWriteService.delete(bookmark.id)
      expect(success).toBe(true)

      // 验证书签已被删除
      const allBookmarks = bookmarkReadService.getAll(999)
      expect(allBookmarks.length).toBe(0)
    })

    it('当书签不存在时应该返回 false', () => {
      const success = bookmarkWriteService.delete(99999)
      expect(success).toBe(false)
    })
  })

  describe('getAll() - 获取所有书签', () => {
    beforeEach(() => {
      // 创建测试数据
      bookmarkWriteService.add({
        name: 'Public',
        url: createUniqueUrl('public'),
        categoryId: testCategoryId,
        level: 0
      })

      bookmarkWriteService.add({
        name: 'Private',
        url: createUniqueUrl('private'),
        categoryId: testCategoryId,
        level: 2
      })
    })

    it('应该返回所有权限内的书签', () => {
      const bookmarks = bookmarkReadService.getAll(2)
      expect(bookmarks.length).toBe(2)
    })

    it('应该过滤掉权限不足的书签', () => {
      const bookmarks = bookmarkReadService.getAll(0)
      expect(bookmarks.length).toBe(1)
      expect(bookmarks[0].name).toBe('Public')
    })

    it('应该过滤掉无效分类的书签', () => {
      const validIds = new Set([testCategoryId])
      const bookmarks = bookmarkReadService.getAll(999, validIds)
      expect(bookmarks.length).toBe(2)

      const emptyIds = new Set()
      const filtered = bookmarkReadService.getAll(999, emptyIds)
      expect(filtered.length).toBe(0)
    })
  })

  describe('track Click() - 记录点击统计', () => {
    it('应该增加点击次数并更新访问时间', () => {
      const url = createUniqueUrl('click')
      const bookmark = bookmarkWriteService.add({
        name: 'Click Test',
        url,
        categoryId: testCategoryId
      })

      const updated = bookmarkWriteService.trackClick(bookmark.id)
      expect(updated).toBeDefined()
      expect(updated.clickCount).toBe(1)
      expect(updated.lastVisited).toBeDefined()
    })

    it('应该累计点击次数', () => {
      const url = createUniqueUrl('multiclick')
      const bookmark = bookmarkWriteService.add({
        name: 'Multi Click',
        url,
        categoryId: testCategoryId
      })

      bookmarkWriteService.trackClick(bookmark.id)
      const updated = bookmarkWriteService.trackClick(bookmark.id)

      expect(updated.clickCount).toBe(2)
    })

    it('当书签不存在时应该返回 null', () => {
      const result = bookmarkWriteService.trackClick(99999)
      expect(result).toBeNull()
    })
  })

  describe('checkUrl() - 检查 URL 是否存在', () => {
    it('应该检测到已存在的 URL', () => {
      const url = createUniqueUrl('existing')
      bookmarkWriteService.add({
        name: 'Existing',
        url,
        categoryId: testCategoryId
      })

      const existing = bookmarkReadService.checkUrl(url)
      expect(existing).toBeDefined()
      expect(existing.url).toBe(url)
    })

    it('当 URL 不存在时应该返回 null', () => {
      const result = bookmarkReadService.checkUrl('https://notexist.com')
      expect(result).toBeNull()
    })
  })
})

describe('categoryRead/WriteService 单元测试', () => {

  beforeEach(() => {
    resetBookmarkTables()
  })

  afterEach(() => {
    resetBookmarkTables()
    closeDb()
  })

  describe('add() - 添加分类', () => {
    it('应该成功添加分类', () => {
      const category = categoryWriteService.add({
        name: '开发工具',
        icon: '🔧',
        level: 0
      })

      expect(category).toBeDefined()
      expect(category.id).toBeGreaterThan(0)
      expect(category.name).toBe('开发工具')
      expect(category.icon).toBe('🔧')
      expect(category.level).toBe(0)
      expect(category.parentId).toBeNull()
    })

    it('应该支持子分类', () => {
      const parent = categoryWriteService.add({
        name: '编程语言',
        level: 0
      })

      const child = categoryWriteService.add({
        name: 'JavaScript',
        parentId: parent.id,
        level: 0
      })

      expect(child.parentId).toBe(parent.id)
    })

    it('应该为未命名分类设置默认名称', () => {
      const category = categoryWriteService.add({})
      expect(category).toBeDefined()
      expect(category.id).toBeGreaterThan(0)
      expect(category.name).toBe('New Category')
    })
  })

  describe('getAll() - 获取所有分类', () => {
    it('应该返回所有权限内的分类', () => {
      categoryWriteService.add({ name: 'Public', level: 0 })
      categoryWriteService.add({ name: 'Admin', level: 3 })

      const all = categoryReadService.getAll(3)
      expect(all.length).toBe(2)

      const limited = categoryReadService.getAll(0)
      expect(limited.length).toBe(1)
      expect(limited[0].name).toBe('Public')
    })
  })

  describe('delete() - 删除分类', () => {
    it('当分类下没有书签时应该返回删除结果', () => {
      const category = categoryWriteService.add({ name: 'Empty' })
      const result = categoryWriteService.delete(category.id)

      expect(result).toEqual({
        id: category.id,
        parentId: null,
        targetCategoryId: 0
      })
    })

    it('当分类下有书签时应该将书签迁移到未分类', () => {
      const category = categoryWriteService.add({ name: 'Has Items' })

      // 添加书签
      const bookmark = bookmarkWriteService.add({
        name: 'Test',
        url: createUniqueUrl('category-test'),
        categoryId: category.id
      })

      const result = categoryWriteService.delete(category.id)
      const items = bookmarkReadService.getAll(0)

      expect(result).toEqual({
        id: category.id,
        parentId: null,
        targetCategoryId: 0
      })
      expect(items.find((item) => item.id === bookmark.id)?.categoryId).toBe(0)
    })
  })
})
