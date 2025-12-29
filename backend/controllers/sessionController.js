import { sessionService } from '../services/sessionService.js';
import { auditService } from '../services/auditService.js';

const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.connection?.remoteAddress ||
        req.ip ||
        'unknown';
};

export const sessionController = {
    getSessions: (req, res) => {
        const sessions = sessionService.getByUsername(req.user.username);
        const currentSessionId = req.user.sessionId;

        res.json({
            sessions: sessions.map(s => ({
                ...s,
                isCurrent: s.sessionId === currentSessionId
            }))
        });
    },

    revokeOthers: (req, res) => {
        const count = sessionService.revokeOthers(req.user.username, req.user.sessionId);
        auditService.log('revoke_sessions', {
            username: req.user.username,
            revokedCount: count,
            ip: getClientIP(req)
        });
        res.json({ success: true, revokedCount: count });
    },

    revokeSession: (req, res) => {
        const { sessionId } = req.params;
        const sessions = sessionService.getByUsername(req.user.username);

        // 只能踢出自己的会话
        if (!sessions.some(s => s.sessionId === sessionId)) {
            return res.status(403).json({ error: '无权操作此会话' });
        }

        sessionService.revoke(sessionId);

        auditService.log('revoke_sessions', {
            username: req.user.username,
            details: `Revoked session: ${sessionId.substring(0, 8)}...`,
            ip: getClientIP(req)
        });

        res.json({ success: true });
    }
};
