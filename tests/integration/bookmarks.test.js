import { describe, it, expect, beforeEach } from 'vitest'
import {
  api,
  cleanupTestData,
  createTestCategory,
  createTestUser,
  loginAsUser,
  unwrapResponseBody
} from '../setup/testHelpers.js'

describe('Bookmarks API Integration Tests', () => {
  let token
  let defaultCategoryId

  beforeEach(async () => {
    cleanupTestData()
    const category = await createTestCategory('test_category')
    defaultCategoryId = category.id
    token = await loginAsUser()
  })

  describe('完整的书签生命周期', () => {
    it('should create, read, update, and delete a bookmark', async () => {
      const uniqueName = `test_integration_bookmark_${Date.now()}`

      // 2. 创建一个书签
      const createRes = await api
        .post('/api/bookmark')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: uniqueName,
          url: 'https://test-integration.com',
          categoryId: defaultCategoryId
        })

      expect(createRes.status).toBe(200)
      const bookmarkId = unwrapResponseBody(createRes.body).item.id

      // 3. 读取并修改书签
      const getRes = await api.get('/api/data').set('Authorization', `Bearer ${token}`)
      const data = unwrapResponseBody(getRes.body)

      expect(getRes.status).toBe(200)
      const bookmark = data.items.find((s) => s.id === bookmarkId)
      expect(bookmark).toBeDefined()
      expect(bookmark.name).toBe(uniqueName)

      // 4. 更新书签
      const updateRes = await api
        .put(`/api/bookmark/${bookmarkId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `${uniqueName}_updated`
        })

      expect(updateRes.status).toBe(200)

      // 5. 删除书签
      const deleteRes = await api
        .delete(`/api/bookmark/${bookmarkId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(deleteRes.status).toBe(200)
      expect(deleteRes.body.success).toBe(true)

      // 等待数据库同步，防止 SQLite WAL 延迟导致幻读
      await new Promise((resolve) => setTimeout(resolve, 50))

      // 验证已删除
      const verifyRes = await api.get('/api/data').set('Authorization', `Bearer ${token}`)
      const verifyData = unwrapResponseBody(verifyRes.body)

      const deletedBookmark = verifyData.items.find((s) => s.id === bookmarkId)
      expect(deletedBookmark).toBeUndefined()
    })
  })

  describe('分类生命周期', () => {
    it('should create and update a category through category routes', async () => {
      const suffix = Date.now()
      const createRes = await api
        .post('/api/category')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `test_category_${suffix}`,
          icon: 'icon-folder',
          parentId: defaultCategoryId
        })

      expect(createRes.status).toBe(200)

      const createdCategory = unwrapResponseBody(createRes.body).item
      expect(createdCategory.name).toBe(`test_category_${suffix}`)
      expect(createdCategory.icon).toBe('icon-folder')
      expect(createdCategory.parentId).toBe(defaultCategoryId)

      const updateRes = await api
        .put(`/api/category/${createdCategory.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `updated_category_${suffix}`,
          parentId: ''
        })

      expect(updateRes.status).toBe(200)

      const updatedCategory = unwrapResponseBody(updateRes.body).item
      expect(updatedCategory).toMatchObject({
        id: createdCategory.id,
        name: `updated_category_${suffix}`,
        parentId: null
      })
    })

    it('should delete a nested category and migrate descendants and items to the parent', async () => {
      const suffix = Date.now()

      const parentRes = await api
        .post('/api/category')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `parent_${suffix}` })
      const parentId = unwrapResponseBody(parentRes.body).item.id

      const childRes = await api
        .post('/api/category')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `child_${suffix}`, parentId })
      const childId = unwrapResponseBody(childRes.body).item.id

      const grandchildRes = await api
        .post('/api/category')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `grandchild_${suffix}`, parentId: childId })
      const grandchildId = unwrapResponseBody(grandchildRes.body).item.id

      const itemRes = await api
        .post('/api/bookmark')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `child_item_${suffix}`,
          url: `https://child-item-${suffix}.example.com`,
          categoryId: childId
        })
      const itemId = unwrapResponseBody(itemRes.body).item.id

      const deleteRes = await api
        .delete(`/api/category/${childId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(deleteRes.status).toBe(200)
      expect(deleteRes.body.success).toBe(true)

      const verifyRes = await api.get('/api/data').set('Authorization', `Bearer ${token}`)
      const data = unwrapResponseBody(verifyRes.body)

      expect(data.categories.find((category) => category.id === childId)).toBeUndefined()
      expect(data.categories.find((category) => category.id === grandchildId)?.parentId).toBe(
        parentId
      )
      expect(data.items.find((item) => item.id === itemId)?.categoryId).toBe(parentId)
    })

    it('should keep uncategorized items visible after deleting a root category', async () => {
      const suffix = Date.now()

      const rootRes = await api
        .post('/api/category')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `root_${suffix}` })
      const rootId = unwrapResponseBody(rootRes.body).item.id

      const childRes = await api
        .post('/api/category')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `root_child_${suffix}`, parentId: rootId })
      const childId = unwrapResponseBody(childRes.body).item.id

      const itemUrl = `https://root-item-${suffix}.example.com`
      const itemName = `root_item_${suffix}`

      const itemRes = await api.post('/api/bookmark').set('Authorization', `Bearer ${token}`).send({
        name: itemName,
        url: itemUrl,
        categoryId: rootId
      })
      const itemId = unwrapResponseBody(itemRes.body).item.id

      const deleteRes = await api
        .delete(`/api/category/${rootId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(deleteRes.status).toBe(200)

      const [dataRes, checkRes, searchRes] = await Promise.all([
        api.get('/api/data').set('Authorization', `Bearer ${token}`),
        api
          .get(`/api/bookmark/check?url=${encodeURIComponent(itemUrl)}`)
          .set('Authorization', `Bearer ${token}`),
        api
          .get(`/api/bookmark/search?q=${encodeURIComponent(itemName)}`)
          .set('Authorization', `Bearer ${token}`)
      ])

      const data = unwrapResponseBody(dataRes.body)
      const checkData = unwrapResponseBody(checkRes.body)
      const searchData = unwrapResponseBody(searchRes.body)
      const saveRes = await api.post('/api/data').set('Authorization', `Bearer ${token}`).send({
        categories: data.categories,
        items: data.items,
        action: 'round-trip uncategorized root delete'
      })

      expect(data.categories.find((category) => category.id === rootId)).toBeUndefined()
      expect(data.categories.find((category) => category.id === childId)?.parentId).toBeNull()
      expect(data.items.find((item) => item.id === itemId)?.categoryId).toBe(0)
      expect(saveRes.status).toBe(200)
      expect(checkData).toMatchObject({
        exists: true,
        item: expect.objectContaining({
          id: itemId,
          categoryId: 0
        })
      })
      expect(searchData.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: itemId,
            categoryId: 0,
            categoryName: '未分类'
          })
        ])
      )
    })
  })

  describe('权限控制', () => {
    it('should return 200 (guest mode) for unauthenticated requests', async () => {
      const res = await api.get('/api/data')
      expect(res.status).toBe(200)
    })

    it('should respect minLevel visibility', async () => {
      const highLevelBookmark = 'test_高权限书签'
      // 直接在 DB 注入高权限书签，测试助手会处理缓存刷新
      const { getDb } = await import('../../src/server/services/database/database.js')
      const { invalidateCache } = await import('../../src/server/services/bookmark/cache.js')
      const db = getDb()
      db.prepare('INSERT INTO items (name, url, category_id, level) VALUES (?, ?, ?, ?)').run(
        highLevelBookmark,
        'https://secret.com',
        defaultCategoryId,
        5
      )
      invalidateCache()

      // 以普通权限 (level 1) 登录的用户不应看到它
      const res = await api.get('/api/data').set('Authorization', `Bearer ${token}`)
      const data = unwrapResponseBody(res.body)

      const found = data.items.find((s) => s.name === highLevelBookmark)
      expect(found).toBeUndefined()
    })

    it('should not leak high-level bookmarks or categories through search/check/simple APIs', async () => {
      const lowUsername = `level1user${Date.now()}`
      const lowPassword = 'Secret123!'
      await createTestUser(lowUsername, lowPassword, 1)
      const lowToken = await loginAsUser(lowUsername, lowPassword)

      const { getDb } = await import('../../src/server/services/database/database.js')
      const { invalidateCache } = await import('../../src/server/services/bookmark/cache.js')
      const cache = (await import('../../src/server/services/cache/cacheService.js')).default
      const db = getDb()

      const hiddenCategory = db
        .prepare('INSERT INTO categories (name, level) VALUES (?, ?)')
        .run(`hidden_category_${Date.now()}`, 2)
      const hiddenUrl = `https://hidden-${Date.now()}.example.com`
      const hiddenName = `hidden_bookmark_${Date.now()}`

      db.prepare('INSERT INTO items (name, url, category_id, level) VALUES (?, ?, ?, ?)').run(
        hiddenName,
        hiddenUrl,
        hiddenCategory.lastInsertRowid,
        2
      )

      invalidateCache()
      cache.flush()

      const [searchRes, checkRes, categoriesRes] = await Promise.all([
        api
          .get(`/api/bookmark/search?q=${encodeURIComponent(hiddenName)}`)
          .set('Authorization', `Bearer ${lowToken}`),
        api
          .get(`/api/bookmark/check?url=${encodeURIComponent(hiddenUrl)}`)
          .set('Authorization', `Bearer ${lowToken}`),
        api.get('/api/categories/simple').set('Authorization', `Bearer ${lowToken}`)
      ])

      const searchData = unwrapResponseBody(searchRes.body)
      const checkData = unwrapResponseBody(checkRes.body)
      const categoriesData = unwrapResponseBody(categoriesRes.body)

      expect(searchRes.status).toBe(200)
      expect(searchData.items).toEqual([])

      expect(checkRes.status).toBe(200)
      expect(checkData.exists).toBe(false)
      expect(checkData.item).toBeNull()

      expect(categoriesRes.status).toBe(200)
      expect(
        categoriesData.categories.find((category) => category.id === hiddenCategory.lastInsertRowid)
      ).toBeUndefined()
    })
  })

  describe('数据验证', () => {
    it('should reject bookmark with invalid URL', async () => {
      const res = await api.post('/api/bookmark').set('Authorization', `Bearer ${token}`).send({
        name: 'invalid',
        url: 'not-a-url',
        categoryId: defaultCategoryId
      })

      expect(res.status).toBe(400)
    })

    it('should reject duplicate bookmark URL', async () => {
      const url = `https://duplicate-${Date.now()}.com`
      await api.post('/api/bookmark').set('Authorization', `Bearer ${token}`).send({
        name: 'test_first',
        url: url,
        categoryId: defaultCategoryId
      })

      const res = await api.post('/api/bookmark').set('Authorization', `Bearer ${token}`).send({
        name: 'test_second',
        url: url,
        categoryId: defaultCategoryId
      })

      expect(res.status).toBe(409)
    })
  })

  describe('书签搜索', () => {
    it('should search bookmarks by keyword', async () => {
      // 准备数据
      await api.post('/api/bookmark').set('Authorization', `Bearer ${token}`).send({
        name: 'GitHub Project',
        url: 'https://github.com',
        categoryId: defaultCategoryId
      })

      const res = await api
        .get('/api/bookmark/search?q=Git')
        .set('Authorization', `Bearer ${token}`)
      const data = unwrapResponseBody(res.body)

      expect(res.status).toBe(200)
      expect(Array.isArray(data.items)).toBe(true)
      expect(data.items.length).toBeGreaterThan(0)
      expect(data.items[0].name.toLowerCase()).toContain('git')
    })
  })
})
