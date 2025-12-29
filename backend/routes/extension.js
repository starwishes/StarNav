import express from 'express';
import { extensionController } from '../controllers/extensionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 下载预配置的浏览器扩展 (需要登录)
router.get('/extension/download', authenticate, extensionController.downloadExtension);

export default router;
