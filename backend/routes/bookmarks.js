import express from 'express';
import { bookmarkController } from '../controllers/bookmarkController.js';
import { authenticate } from '../middleware/auth.js';
import { dataUpdateLimiter } from '../middleware/limiter.js';

const router = express.Router();

// 公开接口 (带可选 Token 解析)
router.get('/data', bookmarkController.getData);

// 受保护接口 (需登录 + 限流)
router.post('/data', authenticate, dataUpdateLimiter, bookmarkController.saveData);

// 浏览器插件专用接口
router.post('/bookmark', authenticate, bookmarkController.addBookmark);
router.get('/bookmark/check', authenticate, bookmarkController.checkBookmark);
router.get('/bookmark/search', authenticate, bookmarkController.searchBookmarks);
router.get('/categories/simple', authenticate, bookmarkController.getSimpleCategories);
router.post('/category', authenticate, bookmarkController.createCategory);

// 统计接口
router.post('/sites/:id/click', bookmarkController.trackClick);

export default router;
