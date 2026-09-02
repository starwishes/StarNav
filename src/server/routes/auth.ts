import express from 'express'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { loginLimiter, loginIpLimiter } from '../middleware/limiter.js'
import { authController } from '../controllers/authController.js'
import { adminController } from '../controllers/adminController.js'
import { sessionController } from '../controllers/sessionController.js'

const router = express.Router()

/**
 * @swagger
 * /login:
 *   post:
 *     tags: [Auth]
 *     summary: User login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: admin }
 *               password: { type: string, example: admin }
 *               remember: { type: boolean, description: 记住登录（延长令牌有效期） }
 *     responses:
 *       200:
 *         description: >-
 *           Login successful. Response body is source-conditional: browser web
 *           requests (http/https Origin/Referer) OMIT `token` — auth is carried
 *           by the HttpOnly Cookie only; browser extensions (chrome-extension://)
 *           and CLI/no-Origin clients KEEP `token` in the body for Bearer usage.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 token: { type: string, description: 仅浏览器扩展与 CLI/无 Origin 客户端返回；浏览器 Web 请求响应体剥离 }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/login', loginIpLimiter, loginLimiter, authController.login)

/**
 * @swagger
 * /logout:
 *   post:
 *     tags: [Auth]
 *     summary: User logout
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticate, authController.logout)

/**
 * @swagger
 * /register:
 *   post:
 *     tags: [Auth]
 *     summary: 用户注册
 *     description: 需要系统设置允许注册
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: 注册成功
 */
router.post('/register', loginIpLimiter, loginLimiter, authController.register)

/**
 * @swagger
 * /sessions:
 *   get:
 *     tags: [Sessions]
 *     summary: 获取当前用户的所有会话
 *     security:
 *       - bearerAuth: []
 */
router.get('/sessions', authenticate, sessionController.getSessions)

/**
 * @swagger
 * /sessions/revoke-others:
 *   post:
 *     tags: [Sessions]
 *     summary: 撤销除当前会话外的所有会话
 *     security:
 *       - bearerAuth: []
 */
router.post('/sessions/revoke-others', authenticate, sessionController.revokeOthers)

/**
 * @swagger
 * /sessions/{sessionId}:
 *   delete:
 *     tags: [Sessions]
 *     summary: 撤销指定会话
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     security:
 *       - bearerAuth: []
 */
router.delete('/sessions/:sessionId', authenticate, sessionController.revokeSession)

/**
 * @swagger
 * /admin/audit:
 *   get:
 *     tags: [Admin]
 *     summary: 获取审计日志
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     tags: [Admin]
 *     summary: 清空审计日志
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/audit', authenticate, requireAdmin, adminController.getAuditLogs)
router.delete('/admin/audit', authenticate, requireAdmin, adminController.clearAuditLogs)

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: 获取所有用户
 *     security:
 *       - bearerAuth: []
 *   post:
 *     tags: [Admin]
 *     summary: 创建新用户
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/users', authenticate, requireAdmin, adminController.getUsers)
router.post('/admin/users', authenticate, requireAdmin, adminController.createUser)
router.patch('/admin/users/:username', authenticate, requireAdmin, adminController.updateUser)

/**
 * @swagger
 * /admin/users/{username}:
 *   patch:
 *     tags: [Admin]
 *     summary: 更新用户
 *     parameters:
 *       - name: username
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     tags: [Admin]
 *     summary: 删除用户
 *     parameters:
 *       - name: username
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     security:
 *       - bearerAuth: []
 */
router.delete('/admin/users/:username', authenticate, requireAdmin, adminController.deleteUser)

export default router
