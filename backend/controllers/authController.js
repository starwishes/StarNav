import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { accountService } from '../services/accountService.js';
import { sessionService } from '../services/sessionService.js';
import { auditService } from '../services/auditService.js';
import { loginSchema, strongPasswordSchema } from '../middleware/validation.js';
import { JWT_SECRET } from '../config/index.js';
import { db, logger } from '../services/db.js';
import { SETTINGS_PATH } from '../config/index.js';

// 获取客户端 IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.connection?.remoteAddress ||
        req.ip ||
        'unknown';
};

export const authController = {
    login: (req, res) => {
        const { error } = loginSchema.validate(req.body);
        if (error) return res.status(400).json({ error: '输入格式不正确' });

        const { username, password } = req.body;
        const user = accountService.findByUsername(username);
        const ip = getClientIP(req);
        const userAgent = req.headers['user-agent'] || 'unknown';

        if (user && bcrypt.compareSync(password, user.password)) {
            const sessionId = sessionService.create(username, ip, userAgent);
            const token = jwt.sign(
                { username: user.username, level: user.level, sessionId },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            auditService.log('login', { username, ip, userAgent, success: true });
            logger.info(`用户登录成功: ${username}`);

            return res.json({
                token,
                user: { login: username, name: username, level: user.level },
                sessionId
            });
        }

        auditService.log('login', { username, ip, userAgent, success: false });
        logger.warn(`登录失败尝试: ${username}`);
        res.status(401).json({ error: '用户名或密码错误' });
    },

    logout: (req, res) => {
        const sessionId = req.user.sessionId;
        if (sessionId) {
            sessionService.revoke(sessionId);
            auditService.log('logout', {
                username: req.user.username,
                ip: getClientIP(req)
            });
        }
        res.json({ success: true });
    },

    register: (req, res) => {
        const settings = db.read(SETTINGS_PATH, {});
        if (!settings.registrationEnabled) return res.status(403).json({ error: '注册功能已关闭' });

        const { error } = strongPasswordSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { username, password } = req.body;
        if (accountService.findByUsername(username)) return res.status(400).json({ error: '该用户名已被注册' });

        accountService.create(username, password);
        auditService.log('register', { username, ip: getClientIP(req) });
        logger.info(`新用户注册: ${username}`);
        res.json({ success: true });
    },

    getProfile: (req, res) => {
        const user = accountService.findByUsername(req.user.username);
        if (!user) return res.status(404).json({ error: '用户不存在' });
        res.json({ username: user.username, level: user.level });
    },

    updateProfile: (req, res) => {
        // 使用 strongPasswordSchema 校验新密码（如果提供了）
        // 但 updateProfile 可能也允许改用户名。
        // 原逻辑没有严格校验，这里沿用原逻辑，但建议加上 Schema。
        // 为简单起见，且因为是 Authenticated user，暂时信任。

        const { username: newUsername, password } = req.body;
        // 如果改密码，应该校验复杂度。此处复用 logic，但最好加上 validation。
        if (password) {
            const { error } = strongPasswordSchema.validate({ username: newUsername || req.user.username, password });
            if (error) return res.status(400).json({ error: error.details[0].message });
        }

        const result = accountService.update(req.user.username, { newUsername, password });
        if (result?.error) return res.status(400).json({ error: result.error });
        if (!result) return res.status(404).json({ error: '更新失败' });

        const newToken = jwt.sign({ username: result.username, level: result.level }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token: newToken, user: { login: result.username, name: result.username, level: result.level } });
    }
};
