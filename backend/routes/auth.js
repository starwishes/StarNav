import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/limiter.js';
import { authController } from '../controllers/authController.js';
import { adminController } from '../controllers/adminController.js';
import { sessionController } from '../controllers/sessionController.js';

const router = express.Router();

// --- 认证相关 ---
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/register', loginLimiter, authController.register);

// --- 个人资料 ---
router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, authController.updateProfile);

// --- 会话管理 ---
router.get('/sessions', authenticate, sessionController.getSessions);
router.post('/sessions/revoke-others', authenticate, sessionController.revokeOthers);
router.delete('/sessions/:sessionId', authenticate, sessionController.revokeSession);

// --- 管理员功能 (审计 & 用户) ---
router.get('/admin/audit', authenticate, requireAdmin, adminController.getAuditLogs);
router.delete('/admin/audit', authenticate, requireAdmin, adminController.clearAuditLogs);

router.get('/admin/users', authenticate, requireAdmin, adminController.getUsers);
router.post('/admin/users', authenticate, requireAdmin, adminController.createUser);
router.delete('/admin/users/:username', authenticate, requireAdmin, adminController.deleteUser);

export default router;
