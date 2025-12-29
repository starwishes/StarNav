import { db, logger } from './db.js';
import { getUserDataPath, DATA_DIR } from '../config/index.js';
import path from 'path';

const TRASH_FILE = path.join(DATA_DIR, 'trash.json');

/**
 * 回收站服务 (Soft Delete)
 */
export const recycleService = {
    /**
     * 将书签移入回收站
     * @param {string} username - 用户名
     * @param {object} item - 被删除的书签对象
     * @returns {boolean}
     */
    moveToTrash: (username, item) => {
        try {
            const trash = db.read(TRASH_FILE, []);
            trash.push({
                ...item,
                deletedAt: new Date().toISOString(),
                deletedBy: username
            });
            db.write(TRASH_FILE, trash);
            logger.info(`书签移入回收站: ${item.name}`);
            return true;
        } catch (err) {
            logger.error('移入回收站失败', err);
            return false;
        }
    },

    /**
     * 获取回收站内容
     * @returns {Array}
     */
    getTrash: () => {
        return db.read(TRASH_FILE, []);
    },

    /**
     * 从回收站恢复书签
     * @param {number} itemId - 书签ID
     * @param {string} username - 恢复到的用户数据
     * @returns {object|null} 恢复的书签或null
     */
    restore: (itemId, username) => {
        try {
            const trash = db.read(TRASH_FILE, []);
            const index = trash.findIndex(i => i.id === itemId);
            if (index === -1) return null;

            const [item] = trash.splice(index, 1);
            delete item.deletedAt;
            delete item.deletedBy;

            // 回写回收站
            db.write(TRASH_FILE, trash);

            // 恢复到用户数据
            const dataPath = getUserDataPath(username);
            const userData = db.read(dataPath, { categories: [], items: [] });

            // 确保ID不冲突
            const maxId = userData.items.reduce((max, i) => Math.max(max, i.id || 0), 0);
            if (userData.items.some(i => i.id === item.id)) {
                item.id = maxId + 1;
            }

            userData.items.push(item);
            db.write(dataPath, userData);

            logger.info(`书签已恢复: ${item.name}`);
            return item;
        } catch (err) {
            logger.error('恢复书签失败', err);
            return null;
        }
    },

    /**
     * 永久删除回收站中的单个书签
     * @param {number} itemId - 书签ID
     * @returns {boolean}
     */
    permanentDelete: (itemId) => {
        try {
            const trash = db.read(TRASH_FILE, []);
            const index = trash.findIndex(i => i.id === itemId);
            if (index === -1) return false;

            trash.splice(index, 1);
            db.write(TRASH_FILE, trash);
            logger.info(`书签永久删除: ID ${itemId}`);
            return true;
        } catch (err) {
            logger.error('永久删除失败', err);
            return false;
        }
    },

    /**
     * 清空回收站
     * @returns {boolean}
     */
    emptyTrash: () => {
        try {
            db.write(TRASH_FILE, []);
            logger.info('回收站已清空');
            return true;
        } catch (err) {
            logger.error('清空回收站失败', err);
            return false;
        }
    }
};
