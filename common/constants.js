/**
 * 统一常量定义 (Shared Constants)
 * 适用于: Backend, Frontend, Browser Extension
 */

// 用户权限等级
export const USER_LEVEL = {
    GUEST: 0,
    USER: 1,
    VIP: 2,
    ADMIN: 3
};

// 系统默认配置
export const DEFAULT_CONFIG = {
    PAGE_SIZE: 50,
    MAX_LOGIN_ATTEMPTS: 5,
    JWT_EXPIRES_IN: '7d'
};
