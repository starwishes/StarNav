// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { resetTestDatabase } from '../../setup/testHelpers.js'
import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../../..')

describe('BookmarkService 核心功能测试', () => {
  let bookmarkMutationService
  let bookmarkLookupService
  let bookmarkSnapshotService
  let testDataDir

  beforeEach(async () => {
    testDataDir = createTestDataDir('starnav-bookmark-service-test')
    resetTestDatabase()

    // 动态加载服务
    const [mutationModule, lookupModule, snapshotModule] = await Promise.all([
      import(
        path.join(
          projectRoot,
          'src/server/services/bookmark/bookmarkMutationService.js?t=' + Date.now()
        )
      ),
      import(
        path.join(
          projectRoot,
          'src/server/services/bookmark/bookmarkLookupService.js?t=' + Date.now()
        )
      ),
      import(
        path.join(
          projectRoot,
          'src/server/services/bookmark/bookmarkSnapshotService.js?t=' + Date.now()
        )
      )
    ])
    bookmarkMutationService = mutationModule.bookmarkMutationService
    bookmarkLookupService = lookupModule.bookmarkLookupService
    bookmarkSnapshotService = snapshotModule.bookmarkSnapshotService
  })

  afterEach(async () => {
    await cleanupTestDataDir(testDataDir)
  })

  describe('分类管理 (Category Management)', () => {
    it('应该能成功添加分类', () => {
      const category = bookmarkMutationService.addCategory({
        name: '开发工具',
        icon: 'tools',
        minLevel: 0
      })

      expect(category).toBeDefined()
      expect(category.name).toBe('开发工具')
      expect(category.id).toBeDefined()
    })

    it('应该支持子分类层级', () => {
      const parent = bookmarkMutationService.addCategory({ name: '编程语言' })
      const child = bookmarkMutationService.addCategory({
        name: 'JavaScript',
        parentId: parent.id
      })

      expect(child.parentId).toBe(parent.id)
    })

    it('应该支持增量重排分类顺序', async () => {
      const first = bookmarkMutationService.addCategory({ name: '第一项' })
      const second = bookmarkMutationService.addCategory({ name: '第二项' })
      const third = bookmarkMutationService.addCategory({ name: '第三项' })

      const reordered = bookmarkMutationService.reorderCategories([third.id, first.id, second.id])

      expect(reordered.map((category) => category.id)).toEqual([third.id, first.id, second.id])

      const refreshed = bookmarkSnapshotService.getData(0)
      expect(refreshed.categories.slice(0, 3).map((category) => category.id)).toEqual([
        third.id,
        first.id,
        second.id
      ])
    })
  })

  describe('书签管理 (Bookmark Management)', () => {
    it('应该能为分类添加书签', () => {
      const category = bookmarkMutationService.addCategory({ name: '常用' })
      const item = bookmarkMutationService.addItem({
        name: 'GitHub',
        url: 'https://github.com',
        categoryId: category.id
      })

      expect(item).toBeDefined()
      expect(item.name).toBe('GitHub')
      expect(item.categoryId).toBe(category.id)
    })

    it('更新书签应该成功', () => {
      const category = bookmarkMutationService.addCategory({ name: '常用' })
      const item = bookmarkMutationService.addItem({
        name: 'GitHub',
        url: 'https://github.com',
        categoryId: category.id
      })

      const updated = bookmarkMutationService.updateItem(item.id, {
        name: 'GitHub Desktop'
      })

      expect(updated.name).toBe('GitHub Desktop')
    })

    it('删除书签应该成功', () => {
      const category = bookmarkMutationService.addCategory({ name: '常用' })
      const item = bookmarkMutationService.addItem({
        name: 'GitHub',
        url: 'https://github.com',
        categoryId: category.id
      })

      const success = bookmarkMutationService.deleteItem(item.id)
      expect(success).toBe(true)
    })

    it('应该支持增量移动和批量操作', () => {
      const source = bookmarkMutationService.addCategory({ name: '源分类' })
      const target = bookmarkMutationService.addCategory({ name: '目标分类' })
      const first = bookmarkMutationService.addItem({
        name: 'First',
        url: 'https://first.test',
        categoryId: source.id
      })
      const second = bookmarkMutationService.addItem({
        name: 'Second',
        url: 'https://second.test',
        categoryId: source.id
      })
      const targetItem = bookmarkMutationService.addItem({
        name: 'Target',
        url: 'https://target.test',
        categoryId: target.id
      })

      const moved = bookmarkMutationService.moveItem(first.id, target.id, 1)
      expect(moved.categoryId).toBe(target.id)

      const batchMoved = bookmarkMutationService.batchMoveItems([second.id], target.id)
      expect(batchMoved).toHaveLength(1)
      expect(batchMoved[0].categoryId).toBe(target.id)

      const deletedCount = bookmarkMutationService.batchDeleteItems([targetItem.id])
      expect(deletedCount).toBe(1)

      const refreshed = bookmarkSnapshotService.getData(0)
      const targetItems = refreshed.items.filter((item) => item.categoryId === target.id)
      expect(targetItems.map((item) => item.id)).toEqual([moved.id, batchMoved[0].id])
    })
  })

  describe('搜索功能 (Search)', () => {
    it('模糊搜索应该返回匹配结果', () => {
      const category = bookmarkMutationService.addCategory({ name: '测试' })
      bookmarkMutationService.addItem({
        name: 'Google',
        url: 'https://google.com',
        categoryId: category.id
      })
      bookmarkMutationService.addItem({
        name: 'Gmail',
        url: 'https://gmail.com',
        categoryId: category.id
      })
      bookmarkMutationService.addItem({
        name: 'Baidu',
        url: 'https://baidu.com',
        categoryId: category.id
      })

      const results = bookmarkLookupService.searchItems('Gm', 10)
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Gmail')
      expect(results[0].categoryName).toBe('测试')
    })
  })
})
