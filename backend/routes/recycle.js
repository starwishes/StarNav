import express from 'express';
import { recycleService } from '../services/recycleService.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = express.Router();

// 获取回收站内容 (仅管理员)
router.get('/', authenticate, requireAdmin, (req, res) => {
    const trash = recycleService.getTrash();
    return successResponse(res, { items: trash });
});

// 恢复书签 (仅管理员)
router.post('/:id/restore', authenticate, requireAdmin, (req, res) => {
    const itemId = Number(req.params.id);
    const username = req.user.username;

    const restored = recycleService.restore(itemId, username);
    if (restored) {
        return successResponse(res, { item: restored }, '书签已恢复');
    }
    return errorResponse(res, '恢复失败，书签不存在', 404);
});

// 永久删除单个书签 (仅管理员)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
    const itemId = Number(req.params.id);

    if (recycleService.permanentDelete(itemId)) {
        return successResponse(res, null, '已永久删除');
    }
    return errorResponse(res, '删除失败', 404);
});

// 清空回收站 (仅管理员)
router.delete('/', authenticate, requireAdmin, (req, res) => {
    if (recycleService.emptyTrash()) {
        return successResponse(res, null, '回收站已清空');
    }
    return errorResponse(res, '清空失败', 500);
});

export default router;
