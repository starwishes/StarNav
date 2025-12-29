import { accountService } from '../services/accountService.js';
import { auditService } from '../services/auditService.js';
import { strongPasswordSchema } from '../middleware/validation.js';

export const adminController = {
    // 审计日志
    getAuditLogs: (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        res.json(auditService.getLogs(page, limit));
    },

    clearAuditLogs: (req, res) => {
        if (auditService.clear()) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: '清空失败' });
        }
    },

    // 用户管理
    getUsers: (req, res) => {
        res.json(accountService.getAll());
    },

    createUser: (req, res) => {
        const { error } = strongPasswordSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { username, password, level } = req.body;
        if (accountService.findByUsername(username)) return res.status(400).json({ error: '用户已存在' });

        accountService.create(username, password, level);
        res.json({ success: true });
    },

    deleteUser: (req, res) => {
        if (accountService.delete(req.params.username)) res.json({ success: true });
        else res.status(404).json({ error: '用户不存在' });
    }
};
