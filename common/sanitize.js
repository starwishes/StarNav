/**
 * 文本安全清洗 (Shared Module)
 * 防止 XSS 和非法字符注入
 */

// 简单的 HTML 转义
export const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// 文本清理 (去除首尾空格，限制最大长度)
export const sanitizeText = (text, maxLength = 1000) => {
    if (!text) return '';
    if (typeof text !== 'string') return String(text);

    // 1. 去除首尾空白
    let clean = text.trim();

    // 2. 移除常见的不可见控制字符
    clean = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    // 3. 截断长度防止溢出
    if (clean.length > maxLength) {
        clean = clean.substring(0, maxLength);
    }

    return clean;
};

// 自定义验证器: 用户名规则 (字母数字下划线，3-20位)
export const isValidUsername = (username) => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};
