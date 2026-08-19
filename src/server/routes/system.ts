import express from 'express'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { faviconLimiter, healthLimiter } from '../middleware/limiter.js'
import { systemController } from '../controllers/systemController.js'
import { toolController } from '../controllers/toolController.js'

const router = express.Router()

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: 获取系统健康状态
 *     security: []
 *     responses:
 *       200:
 *         description: 系统健康
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: 系统处于降级或异常状态
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
router.get('/health', healthLimiter, systemController.getHealth)

/**
 * @swagger
 * /settings:
 *   get:
 *     tags: [System]
 *     summary: 获取公开站点设置
 *     description: 返回首页所需的公开配置，不包含管理员专用字段。
 *     security: []
 *     responses:
 *       200:
 *         description: 成功返回公开设置
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 siteName: { type: string, example: 星语导航 }
 *                 logoUrl: { type: string, example: /uploads/logo.png }
 *                 faviconUrl: { type: string, example: /uploads/icon.png }
 *                 backgroundUrl: { type: string, example: /uploads/bg.png }
 *                 footerHtml: { type: string, example: '<p>Powered by StarNav</p>' }
 *                 homeUrl: { type: string, example: https://nav.example.com }
 *                 registrationEnabled: { type: boolean, example: false }
 *                 timezone: { type: string, example: Asia/Shanghai }
 */
router.get('/settings', systemController.getPublicSettings)

/**
 * @swagger
 * /admin/settings:
 *   get:
 *     tags: [System]
 *     summary: 获取后台设置
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回后台完整设置
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     tags: [System]
 *     summary: 更新后台设置
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: 设置已保存
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/admin/settings', authenticate, requireAdmin, systemController.getAdminSettings)
router.post('/admin/settings', authenticate, requireAdmin, systemController.updateAdminSettings)

/**
 * @swagger
 * /set-background:
 *   post:
 *     tags: [System]
 *     summary: 直接设置背景图 URL
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url: { type: string, example: /uploads/bg_1712912345.png }
 *     responses:
 *       200:
 *         description: 背景图设置成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 */
router.post('/set-background', authenticate, requireAdmin, systemController.setBackground)

/**
 * @swagger
 * /upload-background:
 *   post:
 *     tags: [System]
 *     summary: 上传背景图
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [data]
 *             properties:
 *               data:
 *                 type: string
 *                 example: data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...
 *     responses:
 *       200:
 *         description: 上传成功并自动写入 backgroundUrl
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 url: { type: string, example: /uploads/bg_1712912345.png }
 */
router.post('/upload-background', authenticate, requireAdmin, systemController.uploadBackground)

/**
 * @swagger
 * /upload-icon:
 *   post:
 *     tags: [System]
 *     summary: 上传图标文件
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [data]
 *             properties:
 *               data:
 *                 type: string
 *                 example: data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...
 *     responses:
 *       200:
 *         description: 图标上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 url: { type: string, example: /uploads/icon_1712912345.png }
 */
router.post('/upload-icon', authenticate, requireAdmin, systemController.uploadIcon)

/**
 * @swagger
 * /uploads:
 *   get:
 *     tags: [System]
 *     summary: 获取已上传文件列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回上传文件
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UploadedFile'
 */
router.get('/uploads', authenticate, requireAdmin, systemController.getUploads)

/**
 * @swagger
 * /uploads/{filename}:
 *   delete:
 *     tags: [System]
 *     summary: 删除上传文件
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: filename
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/uploads/:filename', authenticate, requireAdmin, systemController.deleteUpload)

/**
 * @swagger
 * /favicon:
 *   get:
 *     tags: [Tools]
 *     summary: 代理拉取站点 favicon
 *     security: []
 *     parameters:
 *       - name: url
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: https://github.com
 *     responses:
 *       200:
 *         description: 返回 favicon 二进制内容
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 未找到可用 favicon
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/favicon', faviconLimiter, toolController.getFavicon)

/**
 * @swagger
 * /suggest:
 *   get:
 *     tags: [Tools]
 *     summary: 获取搜索建议
 *     security: []
 *     parameters:
 *       - name: keyword
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: type
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [baidu, google, bing, duckduckgo, brave]
 *           default: baidu
 *     responses:
 *       200:
 *         description: 返回建议词数组
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/suggest', toolController.getSuggestions)

/**
 * @swagger
 * /check-links:
 *   post:
 *     tags: [Tools]
 *     summary: 批量检测公网链接可达性
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [urls]
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 返回每个链接的检测结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LinkCheckResult'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/check-links', authenticate, requireAdmin, toolController.checkLinks)

export default router
