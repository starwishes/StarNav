import express from 'express'
import { statsController } from '../controllers/statsController.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/**
 * @swagger
 * /stats:
 *   get:
 *     tags: [Statistics]
 *     summary: 获取访问统计摘要
 *     description: 返回 PV/UV 摘要、趋势数据以及操作系统和浏览器分布，仅管理员可访问。
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回统计摘要
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     today_pv: { type: integer, example: 42 }
 *                     today_uv: { type: integer, example: 21 }
 *                     total_pv: { type: integer, example: 420 }
 *                     total_uv: { type: integer, example: 210 }
 *                     trend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date: { type: string, example: '2026-04-12' }
 *                           pv: { type: integer, example: 42 }
 *                           uv: { type: integer, example: 21 }
 *                     distribution:
 *                       type: object
 *                       properties:
 *                         os:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name: { type: string, example: Windows }
 *                               value: { type: integer, example: 15 }
 *                         browser:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name: { type: string, example: Chrome }
 *                               value: { type: integer, example: 18 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/stats', authenticate, requireAdmin, statsController.getStats)

/**
 * @swagger
 * /cache:
 *   get:
 *     tags: [Statistics]
 *     summary: 获取缓存运行统计
 *     description: 返回当前内存缓存命中、未命中和键数量，仅管理员监控使用。
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回缓存统计
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/CacheStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/cache', authenticate, requireAdmin, statsController.getCacheStats)

/**
 * @swagger
 * /visit:
 *   post:
 *     tags: [Statistics]
 *     summary: 记录一次访问
 *     description: 公开接口。根据请求头和可选的 `url`/referer 记录访问来源、UA 和 PV/UV，返回纯文本 `OK` 或 `Error`。
 *     security: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 example: https://nav.example.com/
 *                 description: 可选，作为访问来源写入统计
 *     responses:
 *       200:
 *         description: 成功接收访问记录请求
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               enum: [OK, Error]
 */
router.post('/visit', statsController.recordVisit)

export default router
