import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 根目录路径（因为是在 backend/config/ 下，需要向上跳两级）
const ROOT_DIR = path.resolve(__dirname, '../../');

// 数据目录，优先使用环境变量 DATA_PATH，默认使用项目根目录下的 data 文件夹
// 在 Docker 环境中通常会被设置为 /app/data
export const DATA_DIR = process.env.DATA_PATH || path.join(ROOT_DIR, 'data');

export const ACCOUNTS_PATH = path.join(DATA_DIR, 'accounts.json');
export const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const AUDIT_LOG_PATH = path.join(DATA_DIR, 'audit.json');
export const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json');
export const JWT_SECRET_PATH = path.join(DATA_DIR, '.jwt_secret');

/**
 * 默认管理员名称 (主数据拥有者)
 */
export const DEFAULT_ADMIN_NAME = process.env.ADMIN_USERNAME || 'admin';

/**
 * 获取 JWT 密钥
 * 优先级：环境变量 JWT_SECRET > 文件 .jwt_secret > 自动生成
 */
export const getOrCreateJwtSecret = () => {
    // 1. 优先使用环境变量
    if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
    }

    // 2. 尝试从文件读取
    try {
        if (fs.existsSync(JWT_SECRET_PATH)) {
            return fs.readFileSync(JWT_SECRET_PATH, 'utf8').trim();
        }
        // 3. 自动生成并保存到文件
        const secret = crypto.randomBytes(32).toString('hex');
        fs.writeFileSync(JWT_SECRET_PATH, secret, { mode: 0o600 });
        return secret;
    } catch (err) {
        return crypto.randomBytes(32).toString('hex');
    }
};

export const JWT_SECRET = getOrCreateJwtSecret();

/**
 * 获取用户数据文件路径
 */
export const getUserDataPath = (username) => {
    // 只有主管理员的数据保存在根目录 data.json，作为游客展示的默认数据
    if (username === DEFAULT_ADMIN_NAME) return path.join(DATA_DIR, 'data.json');
    return path.join(DATA_DIR, 'users', `${username}.json`);
};
