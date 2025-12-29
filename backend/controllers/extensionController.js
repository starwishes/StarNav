import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { successResponse, errorResponse } from '../utils/response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 插件模板目录 (相对于项目根目录)
const EXTENSION_DIR = path.resolve(__dirname, '../../browser-extension');

export const extensionController = {
    /**
     * 生成预配置的浏览器扩展 ZIP 包
     * GET /extension/download
     */
    downloadExtension: async (req, res) => {
        try {
            const user = req.user;
            const token = req.headers.authorization?.split(' ')[1] || '';

            // 服务器地址 (从请求头或环境变量推断)
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
            const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3333';
            const serverUrl = `${protocol}://${host}`;

            // 检查插件目录是否存在
            if (!fs.existsSync(EXTENSION_DIR)) {
                return errorResponse(res, '插件文件不存在', 404);
            }

            // 设置响应头
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename="starnav-extension.zip"');

            // 创建 ZIP 压缩流
            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.on('error', (err) => {
                console.error('Archive error:', err);
                if (!res.headersSent) {
                    return errorResponse(res, '生成压缩包失败', 500);
                }
            });

            // 管道到响应
            archive.pipe(res);

            // 添加插件文件（排除需要修改的文件）
            // manifest.json
            const manifestPath = path.join(EXTENSION_DIR, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                archive.file(manifestPath, { name: 'manifest.json' });
            }

            // icons 目录
            const iconsPath = path.join(EXTENSION_DIR, 'icons');
            if (fs.existsSync(iconsPath)) {
                archive.directory(iconsPath, 'icons');
            }

            // background 目录
            const bgPath = path.join(EXTENSION_DIR, 'background');
            if (fs.existsSync(bgPath)) {
                archive.directory(bgPath, 'background');
            }

            // popup 目录 - 只添加 CSS（排除 html 和 js，后面会添加修改版本）
            const popupCssPath = path.join(EXTENSION_DIR, 'popup', 'popup.css');
            if (fs.existsSync(popupCssPath)) {
                archive.file(popupCssPath, { name: 'popup/popup.css' });
            }

            // options 目录 - 只添加 JS（排除 html，后面会添加修改版本）
            const optionsJsPath = path.join(EXTENSION_DIR, 'options', 'options.js');
            if (fs.existsSync(optionsJsPath)) {
                archive.file(optionsJsPath, { name: 'options/options.js' });
            }

            // 生成预配置的 config.js 文件
            const configContent = `// StarNav Extension - Auto-generated Configuration
// 此文件由服务器自动生成，包含预配置信息
window.STARNAV_CONFIG = {
    serverUrl: "${serverUrl}",
    token: "${token}",
    user: ${JSON.stringify({ login: user?.username || user?.login || 'user' })}
};
`;
            archive.append(configContent, { name: 'config.js' });

            // 生成修改后的 popup.js (在头部注入配置加载)
            const popupJsPath = path.join(EXTENSION_DIR, 'popup', 'popup.js');
            if (fs.existsSync(popupJsPath)) {
                let popupContent = fs.readFileSync(popupJsPath, 'utf-8');
                // 在文件开头注入配置加载逻辑
                const configLoader = `
// 自动加载预配置
(async function loadPreConfig() {
    if (typeof window.STARNAV_CONFIG !== 'undefined') {
        await chrome.storage.sync.set({
            serverUrl: window.STARNAV_CONFIG.serverUrl,
            token: window.STARNAV_CONFIG.token,
            user: window.STARNAV_CONFIG.user
        });
    }
})();
`;
                popupContent = configLoader + popupContent;
                archive.append(popupContent, { name: 'popup/popup.js' });
            }

            // 修改 popup.html 引入 config.js
            const popupHtmlPath = path.join(EXTENSION_DIR, 'popup', 'popup.html');
            if (fs.existsSync(popupHtmlPath)) {
                let htmlContent = fs.readFileSync(popupHtmlPath, 'utf-8');
                // 在 popup.js 之前引入 config.js
                htmlContent = htmlContent.replace(
                    '<script src="popup.js"></script>',
                    '<script src="../config.js"></script>\n  <script src="popup.js"></script>'
                );
                archive.append(htmlContent, { name: 'popup/popup.html' });
            }

            // 修改 options.html 引入 config.js
            const optionsHtmlPath = path.join(EXTENSION_DIR, 'options', 'options.html');
            if (fs.existsSync(optionsHtmlPath)) {
                let htmlContent = fs.readFileSync(optionsHtmlPath, 'utf-8');
                // 在 options.js 之前引入 config.js
                htmlContent = htmlContent.replace(
                    '<script src="options.js"></script>',
                    '<script src="../config.js"></script>\n  <script src="options.js"></script>'
                );
                archive.append(htmlContent, { name: 'options/options.html' });
            }

            // 完成压缩
            await archive.finalize();

        } catch (error) {
            console.error('Extension download error:', error);
            if (!res.headersSent) {
                return errorResponse(res, '生成插件包失败', 500);
            }
        }
    }
};
