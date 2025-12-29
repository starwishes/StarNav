import { Stats } from '../models/stats.js';
import { UAParser } from 'ua-parser-js';

export const statsLogger = (req, res, next) => {
    // 只统计 GET 请求，且针对页面或明确的 API 资源
    // 排除静态资源、favicon、以及心跳/轮询类型的 API
    if (req.method !== 'GET') return next();

    const url = req.url;

    // 定义需要统计的路径特征
    // 1. 根路径 '/' (访问首页)
    // 2. '/index.html'
    // 注意：SPA 路由通常由前端处理，后端可能只收到 '/'，但也可能收到刷新后的路径
    // 这里的策略是：主要统计对 HTML 文件的请求，或者根路径请求

    // 简单的过滤逻辑：排除显而易见的静态资源
    if (
        url.startsWith('/assets/') ||
        url.startsWith('/uploads/') ||
        url.includes('favicon.ico') ||
        url.includes('/api/') || // 排除 API 调用本身，避免数据污染 (或者可选开启 API 统计)
        url.includes('.js') ||
        url.includes('.css') ||
        url.includes('.png') ||
        url.includes('.jpg') ||
        url.includes('.svg') ||
        url.includes('.woff')
    ) {
        return next();
    }

    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const uaString = req.headers['user-agent'];
        const referrer = req.headers['referer']; // 注意是 referer

        const parser = new UAParser(uaString);
        const result = parser.getResult();

        // 记录不完整也没关系，尽力获取
        Stats.recordVisit({
            ip,
            os: result.os.name || 'Unknown',
            browser: result.browser.name || 'Unknown',
            referrer
        });
    } catch (err) {
        // 统计出错不应影响主流程
        console.error('Stats logging error:', err);
    }

    next();
};
