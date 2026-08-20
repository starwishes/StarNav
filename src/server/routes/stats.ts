import express from 'express'
import { statsController } from '../controllers/statsController.js'
import { dataUpdateLimiter } from '../middleware/limiter.js'

const router = express.Router()

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
router.post('/visit', dataUpdateLimiter, statsController.recordVisit)

export default router
