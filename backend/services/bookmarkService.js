import { db, logger } from './db.js';
import { getUserDataPath, DEFAULT_ADMIN_NAME } from '../config/index.js';
import { normalizeData } from '../utils/normalize.js';

/**
 * 书签/导航数据服务
 */
export const bookmarkService = {
    /**
     * 获取并格式化导航数据
     * @param {string} username - 目标用户名
     * @param {number} visitorLevel - 访问者权限级别
     * @returns {object} { categories: [], items: [] }
     */
    getData: (username = DEFAULT_ADMIN_NAME, visitorLevel = 0) => {
        const dataPath = getUserDataPath(username);
        const rawData = db.read(dataPath, { categories: [], items: [] });

        // 1. 数据归一化 (核心步骤：物理清洗 dirty data)
        const cleanData = normalizeData(rawData);

        // 2. 权限过滤
        const filteredCategories = (cleanData.categories || []).filter(
            cat => (cat.level || 0) <= visitorLevel
        );

        // 3. 构建分类 ID 集合用于 Item 过滤
        // 因为已经 normalize 过，这里全是 Number，可以直接 Set comparison
        const categoryIds = new Set(filteredCategories.map(c => c.id));

        const filteredItems = (cleanData.items || []).filter(item =>
            categoryIds.has(item.categoryId) &&
            (item.level || 0) <= visitorLevel
        );

        return {
            categories: filteredCategories,
            items: filteredItems
        };
    },

    /**
     * 保存导航数据
     * @param {string} username - 用户名
     * @param {object} content - { categories: [], items: [] }
     * @returns {boolean}
     */
    saveData: (username, content) => {
        try {
            // 1. 入库前清洗 (确保写入磁盘的永远是 Number ID)
            const cleanContent = normalizeData(content);

            const dataPath = getUserDataPath(username);
            if (db.write(dataPath, cleanContent)) {
                logger.info(`数据保存成功: ${username}`);
                return true;
            }
        } catch (err) {
            logger.error(`数据保存异常: ${username}`, err);
        }
        return false;
    },

    /**
     * 增加点击统计
     * @param {number} itemId 
     * @param {string} username 
     * @returns {object|null} 更新后的 item 或 null (如果失败)
     */
    trackClick: (itemId, username = DEFAULT_ADMIN_NAME) => {
        const dataPath = getUserDataPath(username);
        const rawData = db.read(dataPath, null);

        if (!rawData) return null;

        // 清洗 ID 以便匹配
        const id = Number(itemId);
        const item = (rawData.items || []).find(i => Number(i.id) === id);

        if (!item) return null;

        // 更新统计
        item.clickCount = (item.clickCount || 0) + 1;
        item.lastVisited = new Date().toISOString();

        // 回写 (这里我们保存 rawData，虽然只改了一个 item，但为了保持其他未动数据的原样)
        // 也可以选择在这里做一次全量 normalize，但考虑到性能，只 update 必要字段
        // 不过既然我们在架构升级，建议还是 normalize 防止历史债务累积
        const cleanData = normalizeData(rawData);

        if (db.write(dataPath, cleanData)) {
            return item; // 返回更新后的 item (包含新的 clickCount)
        }
        return null;
    },

    /**
     * 添加单个书签 (用于浏览器插件)
     * @param {string} username - 用户名
     * @param {object} itemData - { name, url, description?, categoryId, tags?, minLevel? }
     * @returns {object|null} 新创建的 item 或 null
     */
    addItem: (username, itemData) => {
        try {
            const dataPath = getUserDataPath(username);
            const rawData = db.read(dataPath, { categories: [], items: [] });
            const cleanData = normalizeData(rawData);

            // 生成新 ID (取最大 ID + 1)
            const maxId = cleanData.items.reduce((max, item) => Math.max(max, item.id || 0), 0);
            const newItem = {
                id: maxId + 1,
                name: itemData.name || 'Untitled',
                url: itemData.url, // normalizeData 会在入库前处理它，但这里最好先校验
                description: itemData.description || '',
                categoryId: Number(itemData.categoryId),
                pinned: false,
                level: itemData.minLevel || 0,
                clickCount: 0,
                lastVisited: null,
                tags: itemData.tags || []
            };

            cleanData.items.push(newItem);

            if (db.write(dataPath, cleanData)) {
                logger.info(`书签添加成功: ${username} - ${newItem.name}`);
                return newItem;
            }
        } catch (err) {
            logger.error(`书签添加异常: ${username}`, err);
        }
        return null;
    },

    /**
     * 添加分类 (用于浏览器插件)
     * @param {string} username - 用户名
     * @param {object} categoryData - { name, icon?, minLevel? }
     * @returns {object|null} 新创建的分类或 null
     */
    addCategory: (username, categoryData) => {
        const dataPath = getUserDataPath(username);
        const rawData = db.read(dataPath, { categories: [], items: [] });
        const cleanData = normalizeData(rawData);

        // 生成新 ID (取最大 ID + 1)
        const maxId = cleanData.categories.reduce((max, cat) => Math.max(max, cat.id || 0), 0);
        const newCategory = {
            id: maxId + 1,
            name: categoryData.name || 'New Category',
            icon: categoryData.icon || '',
            level: Number(categoryData.minLevel || 0)
        };

        cleanData.categories.push(newCategory);

        if (db.write(dataPath, cleanData)) {
            logger.info(`分类创建成功: ${username} - ${newCategory.name}`);
            return newCategory;
        }
        return null;
    },

    /**
     * 检查 URL 是否已收藏 (用于浏览器插件)
     * @param {string} username - 用户名
     * @param {string} url - 要检查的 URL
     * @returns {object|null} 已存在的 item 或 null
     */
    checkUrlItem: (username, url) => {
        const dataPath = getUserDataPath(username);
        const rawData = db.read(dataPath, { items: [] });
        const cleanData = normalizeData(rawData);

        const targetUrl = url.trim().toLowerCase();
        return cleanData.items.find(item =>
            item.url.trim().toLowerCase() === targetUrl
        ) || null;
    },

    /**
     * 搜索书签 (用于浏览器插件)
     * @param {string} username - 用户名
     * @param {string} keyword - 搜索关键词
     * @param {number} limit - 返回数量限制
     * @returns {Array} 匹配的书签列表
     */
    searchItems: (username, keyword, limit = 10) => {
        const dataPath = getUserDataPath(username);
        const rawData = db.read(dataPath, { categories: [], items: [] });
        const cleanData = normalizeData(rawData);

        const lowerKeyword = (keyword || '').toLowerCase();

        // 如果没有关键词，返回最近访问的书签
        if (!lowerKeyword) {
            const categoryMap = new Map(cleanData.categories.map(c => [c.id, c.name]));
            return cleanData.items
                .sort((a, b) => {
                    // 按 lastVisited 降序排列，null 值排在最后
                    if (!a.lastVisited && !b.lastVisited) return 0;
                    if (!a.lastVisited) return 1;
                    if (!b.lastVisited) return -1;
                    return new Date(b.lastVisited) - new Date(a.lastVisited);
                })
                .slice(0, limit)
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    url: item.url,
                    description: item.description,
                    categoryId: item.categoryId,
                    categoryName: categoryMap.get(item.categoryId) || '未分类',
                    tags: item.tags || []
                }));
        }

        // 构建分类名称映射
        const categoryMap = new Map(cleanData.categories.map(c => [c.id, c.name]));

        // 搜索匹配
        const results = cleanData.items
            .filter(item => {
                const nameMatch = (item.name || '').toLowerCase().includes(lowerKeyword);
                const urlMatch = (item.url || '').toLowerCase().includes(lowerKeyword);
                const descMatch = (item.description || '').toLowerCase().includes(lowerKeyword);
                const tagMatch = (item.tags || []).some(t => t.toLowerCase().includes(lowerKeyword));
                return nameMatch || urlMatch || descMatch || tagMatch;
            })
            .slice(0, limit)
            .map(item => ({
                id: item.id,
                name: item.name,
                url: item.url,
                description: item.description,
                categoryId: item.categoryId,
                categoryName: categoryMap.get(item.categoryId) || '未分类',
                tags: item.tags || []
            }));

        return results;
    },

    /**
     * 获取分类列表 (简化版，用于浏览器插件)
     * @param {string} username - 用户名
     * @returns {Array} [{ id, name }]
     */
    getCategories: (username = DEFAULT_ADMIN_NAME) => {
        const dataPath = getUserDataPath(username);
        const rawData = db.read(dataPath, { categories: [], items: [] });
        const cleanData = normalizeData(rawData);

        return cleanData.categories.map(c => ({ id: c.id, name: c.name }));
    }
};
