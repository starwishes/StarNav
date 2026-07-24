import express from 'express'
import { bookmarkController } from '../controllers/bookmarkController.js'
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.js'
import { dataUpdateLimiter } from '../middleware/limiter.js'

const router = express.Router()

/**
 * @swagger
 * /data:
 *   get:
 *     tags: [Bookmarks]
 *     summary: 获取所有导航数据（书签和分类）
 *     description: 公开接口，未登录用户看到 level=0 的内容，登录用户看到符合权限的内容。成功响应统一返回 `{ success, message, data }`，其中 `data` 包含 `categories/items`。
 *     responses:
 *       200:
 *         $ref: '#/components/responses/NavigationDataResponse'
 */
router.get('/data', optionalAuth, bookmarkController.getData)

/**
 * @swagger
 * /data:
 *   post:
 *     tags: [Bookmarks]
 *     summary: 全量导入/清理/替换导航数据
 *     description: 仅管理员可用。该接口仅用于全量导入、清理或替换导航数据，不作为日常增量写入口。须提供 `action=import|clear|replace`（兼容历史值 `数据导入/清理`）。接受直接 `categories/items`，也兼容 `content.categories/content.items` 包装格式。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [import, clear, replace, 数据导入/清理]
 *                 description: 全量写语义；日常 CRUD 请使用增量书签/分类接口
 *               categories:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/Category' }
 *               items:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/Bookmark' }
 *               content:
 *                 type: object
 *                 description: 兼容旧客户端的包装字段
 *                 properties:
 *                   categories:
 *                     type: array
 *                     items: { $ref: '#/components/schemas/Category' }
 *                   items:
 *                     type: array
 *                     items: { $ref: '#/components/schemas/Bookmark' }
 *                   action:
 *                     type: string
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SaveDataResponse'
 *       401:
 *         description: 未认证
 */
router.post('/data', authenticate, requireAdmin, dataUpdateLimiter, bookmarkController.saveData)

/**
 * @swagger
 * /bookmark:
 *   post:
 *     tags: [Bookmarks]
 *     summary: 创建书签
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, url, categoryId]
 *             properties:
 *               name: { type: string, example: GitHub }
 *               url: { type: string, example: https://github.com }
 *               categoryId: { type: integer, example: 1 }
 *               description: { type: string, example: Code hosting }
 *               minLevel: { type: integer, example: 0 }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/BookmarkResponse'
 *       400:
 *         description: 请求参数错误
 *       409:
 *         description: URL 已存在
 */
router.post('/bookmark', authenticate, requireAdmin, bookmarkController.addBookmark)

/**
 * @swagger
 * /bookmark/search:
 *   get:
 *     tags: [Bookmarks]
 *     summary: 搜索当前权限范围内的书签
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema: { type: string }
 *         description: Search query
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/BookmarkSearchResponse'
 */
router.get('/bookmark/search', authenticate, bookmarkController.searchBookmarks)

/**
 * @swagger
 * /bookmark/check:
 *   get:
 *     tags: [Bookmarks]
 *     summary: 检查当前权限范围内书签 URL 是否已存在
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: url
 *         in: query
 *         required: true
 *         schema: { type: string }
 *         description: 要检查的 URL
 *     responses:
 *       200:
 *         $ref: '#/components/responses/BookmarkExistsResponse'
 */
router.get('/bookmark/check', authenticate, bookmarkController.checkBookmark)

/**
 * @swagger
 * /categories/simple:
 *   get:
 *     tags: [Categories]
 *     summary: 获取当前权限范围内的简化分类列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/responses/CategoriesResponse'
 */
router.get('/categories/simple', authenticate, bookmarkController.getSimpleCategories)

router.put('/categories/reorder', authenticate, requireAdmin, bookmarkController.reorderCategories)

/**
 * @swagger
 * /category:
 *   post:
 *     tags: [Categories]
 *     summary: 创建新分类
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               icon: { type: string }
 *               minLevel: { type: integer, default: 0 }
 *               parentId: { type: integer }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/CategoryResponse'
 */
router.post('/category', authenticate, requireAdmin, bookmarkController.createCategory)

/**
 * @swagger
 * /category/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: 更新分类
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               icon: { type: string }
 *               minLevel: { type: integer, default: 0 }
 *               parentId: { type: integer, nullable: true }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SuccessResponse'
 *   delete:
 *     tags: [Categories]
 *     summary: 删除分类
 *     description: 删除分类时，会将其子分类回挂到上级分类，并将该分类下的书签迁移到上级分类；若无上级分类则迁移到未分类。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SuccessResponse'
 *       404:
 *         description: 分类不存在
 */
router.put('/category/:id', authenticate, requireAdmin, bookmarkController.updateCategory)
router.delete('/category/:id', authenticate, requireAdmin, bookmarkController.deleteCategory)

router.post(
  '/bookmark/batch-move',
  authenticate,
  requireAdmin,
  bookmarkController.batchMoveBookmarks
)
router.post(
  '/bookmark/batch-delete',
  authenticate,
  requireAdmin,
  bookmarkController.batchDeleteBookmarks
)
router.put('/bookmark/:id/move', authenticate, requireAdmin, bookmarkController.moveBookmark)

/**
 * @swagger
 * /bookmark/{id}:
 *   put:
 *     tags: [Bookmarks]
 *     summary: 更新书签
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               url: { type: string }
 *               description: { type: string }
 *               categoryId: { type: integer }
 *               icon: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/BookmarkResponse'
 *   delete:
 *     tags: [Bookmarks]
 *     summary: 删除书签
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SuccessResponse'
 */
router.put('/bookmark/:id', authenticate, requireAdmin, bookmarkController.updateBookmark)
router.delete('/bookmark/:id', authenticate, requireAdmin, bookmarkController.deleteBookmark)

/**
 * @swagger
 * /sites/{id}/click:
 *   post:
 *     tags: [Statistics]
 *     summary: 记录书签点击统计
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/BookmarkResponse'
 *       404:
 *         description: 书签不存在
 */
router.post('/sites/:id/click', bookmarkController.trackClick)

export default router
