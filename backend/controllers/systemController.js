import fs from 'fs';
import path from 'path';
import { db, logger } from '../services/db.js';
import { SETTINGS_PATH, UPLOADS_DIR } from '../config/index.js';

export const systemController = {
    getHealth: (req, res) => {
        res.json({
            status: 'ok',
            version: '1.3.5',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    },

    getPublicSettings: (req, res) => {
        const settings = db.read(SETTINGS_PATH, {});
        res.json({
            registrationEnabled: settings.registrationEnabled,
            backgroundUrl: settings.backgroundUrl || '',
            timezone: settings.timezone || '',
            homeUrl: settings.homeUrl || '',
            footerHtml: settings.footerHtml || '',
            siteName: settings.siteName || ''
        });
    },

    getAdminSettings: (req, res) => {
        // Auth check handled by middleware
        res.json(db.read(SETTINGS_PATH, {}));
    },

    updateAdminSettings: (req, res) => {
        const oldSettings = db.read(SETTINGS_PATH, {});
        db.write(SETTINGS_PATH, { ...oldSettings, ...req.body });
        res.json({ success: true });
    },

    setBackground: (req, res) => {
        const { url } = req.body;
        const settings = db.read(SETTINGS_PATH, {});
        settings.backgroundUrl = url || '';
        db.write(SETTINGS_PATH, settings);
        res.json({ success: true });
    },

    uploadBackground: (req, res) => {
        try {
            const { data } = req.body;
            const matches = data?.match(/^data:image\/(\w+);base64,(.+)$/);
            if (!matches) return res.status(400).json({ error: '格式不正确' });

            const buffer = Buffer.from(matches[2], 'base64');
            const filename = `bg_${Date.now()}.${matches[1] === 'jpeg' ? 'jpg' : matches[1]}`;
            db.ensureDir(UPLOADS_DIR);
            fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

            const settings = db.read(SETTINGS_PATH, {});
            settings.backgroundUrl = `/uploads/${filename}`;
            db.write(SETTINGS_PATH, settings);
            res.json({ success: true, url: settings.backgroundUrl });
        } catch (err) {
            logger.error('上传失败', err);
            res.status(500).json({ error: '保存失败' });
        }
    },

    getUploads: (req, res) => {
        try {
            db.ensureDir(UPLOADS_DIR);
            const files = fs.readdirSync(UPLOADS_DIR)
                .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
                .map(filename => {
                    const stat = fs.statSync(path.join(UPLOADS_DIR, filename));
                    return {
                        filename,
                        url: `/uploads/${filename}`,
                        size: stat.size,
                        uploadedAt: stat.mtime.toISOString()
                    };
                })
                .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
            res.json({ files });
        } catch (err) {
            logger.error('获取上传列表失败', err);
            res.json({ files: [] });
        }
    },

    deleteUpload: (req, res) => {
        const { filename } = req.params;
        const filePath = path.join(UPLOADS_DIR, filename);

        // 安全检查：防止路径遍历
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: '无效的文件名' });
        }

        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                // 如果删除的是当前背景图，清除设置
                const settings = db.read(SETTINGS_PATH, {});
                if (settings.backgroundUrl === `/uploads/${filename}`) {
                    settings.backgroundUrl = '';
                    db.write(SETTINGS_PATH, settings);
                }
                logger.info(`文件已删除: ${filename}`);
                res.json({ success: true });
            } else {
                res.status(404).json({ error: '文件不存在' });
            }
        } catch (err) {
            logger.error('删除文件失败', err);
            res.status(500).json({ error: '删除失败' });
        }
    }
};
