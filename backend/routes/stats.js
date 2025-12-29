import express from 'express';
import { statsController } from '../controllers/statsController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 获取统计数据 (仅管理员)
// 获取统计数据 (仅管理员)
router.get('/stats', authenticate, requireAdmin, statsController.getStats);

// 上报访问 (公开)
router.post('/visit', statsController.recordVisit);

export default router;
