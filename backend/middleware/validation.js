import Joi from 'joi';

/**
 * 密码强度规则：
 * - 至少 8 个字符
 * - 必须包含大写字母、小写字母、数字、特殊符号
 */
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export const loginSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).required(), // 登录时不强制复杂密码（兼容旧账户）
    level: Joi.number().integer().min(1).max(3).optional()
});

// 注册/修改密码时使用强密码验证
export const strongPasswordSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string()
        .pattern(passwordPattern)
        .required()
        .messages({
            'string.pattern.base': 'ERR_PASSWORD_WEAK'
        }),
    level: Joi.number().integer().min(1).max(3).optional()
});

export const itemSchema = Joi.object({
    id: Joi.number().required(),
    name: Joi.string().required(),
    url: Joi.string().required(), // 移除 uri() 校验，兼容内网 IP 或不规范地址
    description: Joi.string().allow('', null),
    categoryId: Joi.number().required(),
    private: Joi.boolean().default(false),
    pinned: Joi.boolean().default(false),
    level: Joi.number().integer().min(0).max(3).default(0),
    clickCount: Joi.number().integer().min(0).allow(null).optional(),
    lastVisited: Joi.string().allow(null, '').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
}).unknown(true); // 允许未知字段，防止因前端增加额外属性导致保存失败

export const categorySchema = Joi.object({
    id: Joi.number().required(),
    name: Joi.string().required(),
    private: Joi.boolean().optional(),
    level: Joi.number().integer().min(0).max(3).default(0),
}).unknown(true);

export const dataSchema = Joi.object({
    content: Joi.object({
        categories: Joi.array().items(categorySchema).required(),
        items: Joi.array().items(itemSchema).required(),
    }).unknown(true).required(),
});
