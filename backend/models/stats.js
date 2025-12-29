import { db, logger } from '../services/db.js';
import path from 'path';

const STATS_FILE = path.resolve('data/stats.json');

/**
 * 访问统计模型
 * 数据结构:
 * {
 *   "total_pv": 0,
 *   "total_uv": 0,
 *   "daily": {
 *     "2023-10-27": { 
 *       "pv": 100, 
 *       "uv_ips": ["ip1", "ip2"],
 *       "referrers": { "google": 10 },
 *       "os": { "Windows": 50 },
 *       "browser": { "Chrome": 80 }
 *     }
 *   }
 * }
 */
export const Stats = {
    // 获取所有统计数据
    getAll() {
        return db.read(STATS_FILE, { total_pv: 0, total_uv: 0, daily: {} });
    },

    // 获取概览数据（用于前端展示）
    getSummary() {
        const data = this.getAll();
        const today = new Date().toISOString().split('T')[0];
        const todayStats = data.daily[today] || { pv: 0, uv_ips: [] };

        // 计算最近 7 天的趋势
        const trend = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStr = d.toISOString().split('T')[0];
            const dayData = data.daily[dayStr] || { pv: 0, uv_ips: [] };
            trend.push({
                date: dayStr,
                pv: dayData.pv,
                uv: dayData.uv_ips.length
            });
        }

        // 聚合 OS 和 Browser 数据（最近 30 天）
        const osStats = {};
        const browserStats = {};

        // 只统计最近 30 天，避免数据陈旧
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        Object.keys(data.daily).forEach(date => {
            if (new Date(date) >= thirtyDaysAgo) {
                const dayData = data.daily[date];
                if (dayData.os) {
                    Object.entries(dayData.os).forEach(([k, v]) => {
                        osStats[k] = (osStats[k] || 0) + v;
                    });
                }
                if (dayData.browser) {
                    Object.entries(dayData.browser).forEach(([k, v]) => {
                        browserStats[k] = (browserStats[k] || 0) + v;
                    });
                }
            }
        });

        return {
            total_pv: data.total_pv,
            total_uv: data.total_uv,
            today_pv: todayStats.pv,
            today_uv: todayStats.uv_ips.length,
            trend,
            distribution: {
                os: Object.entries(osStats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
                browser: Object.entries(browserStats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
            }
        };
    },

    // 记录访问
    recordVisit({ ip, os, browser, referrer }) {
        const data = this.getAll();
        const today = new Date().toISOString().split('T')[0];

        // 初始化今日数据
        if (!data.daily[today]) {
            data.daily[today] = {
                pv: 0,
                uv_ips: [],
                referrers: {},
                os: {},
                browser: {}
            };
        }

        const dayStats = data.daily[today];

        // 更新 PV
        dayStats.pv++;
        data.total_pv++;

        // 更新 UV
        if (!dayStats.uv_ips.includes(ip)) {
            dayStats.uv_ips.push(ip);
            data.total_uv++;
        }

        // 更新维度数据
        if (os) dayStats.os[os] = (dayStats.os[os] || 0) + 1;
        if (browser) dayStats.browser[browser] = (dayStats.browser[browser] || 0) + 1;
        // 简化 referrer，只取域名
        if (referrer) {
            try {
                const hostname = new URL(referrer).hostname;
                dayStats.referrers[hostname] = (dayStats.referrers[hostname] || 0) + 1;
            } catch (e) {
                // 忽略无效 URL
            }
        }

        // 数据清理：删除 60 天前的数据，防止文件过大
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        Object.keys(data.daily).forEach(key => {
            if (new Date(key) < sixtyDaysAgo) {
                delete data.daily[key];
            }
        });

        db.write(STATS_FILE, data);
    }
};
