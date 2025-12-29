import { bookmarkService } from '../services/bookmarkService.js';
import { logger } from '../services/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { DEFAULT_ADMIN_NAME } from '../config/index.js';

/**
 * 书签控制器 (浏览器插件专用)
 */
export const bookmarkController = {
    // GET /api/data - 获取数据 (原有逻辑，由插件调用或前端调用)
    getData: (req, res) => {
        const username = req.user?.username || DEFAULT_ADMIN_NAME;
        const level = req.user?.level || 0;
        const data = bookmarkService.getData(username, level);
        return successResponse(res, data);
    },

    // POST /api/data - 全量保存 (原有逻辑)
    saveData: (req, res) => {
        const username = req.user?.username || DEFAULT_ADMIN_NAME;
        // 兼容处理：支持直接传 content 或者嵌套在 content 键下
        const payload = req.body.content || req.body;
        const { categories, items, action } = payload;
        const actionDesc = action ? ` (${action})` : '';

        if (bookmarkService.saveData(username, { categories: categories || [], items: items || [] })) {
            logger.info(`数据保存成功: ${username}${actionDesc}`);
            return successResponse(res, null, '数据保存成功');
        } else {
            logger.error(`数据保存失败: ${username}${actionDesc}`);
            return errorResponse(res, '数据保存失败', 500);
        }
    },

    // POST /sites/:id/click - 点击次数统计
    trackClick: (req, res) => {
        const { id } = req.params;
        const username = req.user?.username || DEFAULT_ADMIN_NAME;
        const updatedItem = bookmarkService.trackClick(id, username);

        if (updatedItem) {
            return successResponse(res, { item: updatedItem });
        } else {
            return errorResponse(res, '书签未找到', 404);
        }
    },

    // POST /api/bookmark - 添加单个书签 (浏览器插件)
    addBookmark: (req, res) => {
        const username = req.user?.username || DEFAULT_ADMIN_NAME;
        const { name, url, description, categoryId, tags, minLevel } = req.body;

        if (!url) {
            return errorResponse(res, 'URL 不能为空', 400);
        }

        const newItem = bookmarkService.addItem(username, {
            name, url, description, categoryId, tags, minLevel
        });

        if (newItem) {
            return successResponse(res, { bookmark: newItem });
        } else {
            return errorResponse(res, '书签添加失败', 500);
        }
    },

    // GET /api/bookmark/search - 搜索书签 (浏览器插件)
    searchBookmarks: (req, res) => {
        const username = req.user?.username || DEFAULT_ADMIN_NAME;
        const { q, limit } = req.query;

        const results = bookmarkService.searchItems(username, q, parseInt(limit) || 10);
        return successResponse(res, { items: results });
    },

    // GET /categories/simple - 获取分类列表 (浏览器插件)
    getSimpleCategories: (req, res) => {
        const username = req.user?.username || DEFAULT_ADMIN_NAME;
        const categories = bookmarkService.getCategories(username);
        return successResponse(res, { categories });
    },

    // POST /category - 创建新分类 (浏览器插件)
    createCategory: (req, res) => {
        const username = req.user?.username || DEFAULT_ADMIN_NAME;
        const { name, icon, minLevel } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return errorResponse(res, '分类名称不能为空', 400);
        }

        const newCategory = bookmarkService.addCategory(username, {
            name: name.trim(),
            icon: icon || '',
            minLevel: minLevel || 0
        });

        return successResponse(res, { category: newCategory });
    },

    // GET /bookmark/check - 检查书签是否已存在 (浏览器插件)
    checkBookmark: (req, res) => {
        const username = req.user?.username || DEFAULT_ADMIN_NAME;
        const { url } = req.query;

        if (!url) {
            return errorResponse(res, 'URL 不能为空', 400);
        }

        const existingItem = bookmarkService.checkUrlItem(username, url);
        return successResponse(res, {
            exists: !!existingItem,
            item: existingItem
        });
    }
};
