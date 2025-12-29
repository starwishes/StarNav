import path from 'path';
import { db } from './db.js';
import { DATA_DIR } from '../config/index.js';

const LOG_FILE = path.join(DATA_DIR, 'audit.json');

export const auditService = {
    // 获取日志 (支持分页)
    getLogs(page = 1, limit = 50) {
        const logs = db.read(LOG_FILE, []);
        // 按时间倒序
        const sorted = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const start = (page - 1) * limit;
        const end = start + limit;

        return {
            total: sorted.length,
            logs: sorted.slice(start, end)
        };
    },

    // 记录日志
    log(action, data = {}) {
        const logs = db.read(LOG_FILE, []);

        const {
            username = 'anonymous',
            ip = 'unknown',
            userAgent = 'unknown',
            success = true,
            details = ''
        } = data;

        const entry = {
            id: Date.now(),
            action,
            username,
            ip,
            userAgent,
            success,
            details,
            timestamp: new Date().toISOString()
        };

        // 限制日志总数 (保留最近 2000 条)
        if (logs.length >= 2000) {
            logs.splice(0, logs.length - 1999);
        }

        logs.push(entry);
        db.write(LOG_FILE, logs);
    },

    // 清空日志
    clear() {
        return db.write(LOG_FILE, []);
    }
};
