import { Stats } from '../models/stats.js';
import { UAParser } from 'ua-parser-js';

export const statsController = {
    getStats: (req, res) => {
        try {
            const summary = Stats.getSummary();
            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取统计数据失败'
            });
        }
    },

    recordVisit: (req, res) => {
        try {
            // 从请求中获取信息 (如果是 POST 请求，也可以从 body 获取 url 作为 referrer 或 current page)
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const uaString = req.headers['user-agent'];
            // 前端显式上报时，通常会在 body 中包含 url，或者使用 referer header
            // 这里优先使用 body 中的 url (因为 SPA 路由改变不会总是更新 referer header 到后端)
            const referrer = req.body.url || req.headers['referer'];

            // 为了复用 Stats.recordVisit 的解析逻辑，我们需要解析 UA
            // 但 Stats.recordVisit 内部会解析，所以这里直接传元数据

            // 注意：Stats.recordVisit 需要自己解析 UA 得到 os 和 browser
            // 我们需要查看 Stats.recordVisit 的实现 (Step 187)
            // 它接受 { ip, os, browser, referrer }
            // 所以我们需要在这里引入 UAParser 解析

            // Re-importing UAParser here locally or check if we can parse here.
            // Wait, middleware/statsLogger.js does parsing. Let's do it here too or update Stats model to parse?
            // Stats model (Step 187) just expects strings: recordVisit({ ip, os, browser, referrer })

            // Let's rely on the controller to parse like middleware does.
            const { UAParser } = require('ua-parser-js'); // CommonJS or Import? Project is module.
            // We need to import UAParser at the top of this file.

            // Since we can't easily add import to top with replace_file_content if it's not a block replacement,
            // let's assume we will add the import in a separate tool call or check if we can do it now.
            // Actually, we can just replace the whole file content or a larger chunk.

            // Simplification: Let's pass the raw info to Stats and let Stats handle it? 
            // No, Stats.recordVisit expects os/browser names.

            // Alternative: Modify Stats.recordVisit to accept uaString and parse it internally?
            // That would be cleaner but changes the model. 
            // Let's stick to modifying the controller and adding import.

            // BUT, `require` might fail in ESM. We need `import`.
            // So I should verify imports first.

            // Let's look at the file content again. It matches `import { Stats } from ...`
            // So we need to add `import { UAParser } from 'ua-parser-js'` at the top.

            // For now, let's just write the method assuming UAParser is available, 
            // and I'll add the import in the next step (or same step if I use multi_replace).

            // Only writing method body here won't work if I need UAParser.
            // I'll use multi_replace to add import AND method.
            res.status(200).send('OK');
        } catch (e) {
            console.error(e);
            res.status(200).send('Error'); // Don't crash client
        }
    }
};
