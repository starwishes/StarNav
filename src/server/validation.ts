import Joi, { type CustomHelpers } from 'joi'
import { isAllowedTimezone, normalizeOptionalUrl } from '../shared/security/urlSafety.js'
import { errors } from './utils/errors.js'

/**
 * 校验 payload 并按 Joi 转换结果返回；失败抛 400（消息附首个失败字段名）。
 * 在 controller 边界调用，避免把 HTTP 输入校验埋进业务服务内部。
 */
export const validatePayload = <T>(schema: Joi.Schema, payload: unknown, message: string): T => {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    convert: true
  })

  if (error) {
    const firstField = error.details?.[0]?.path?.join('.')
    throw errors.badRequest(firstField ? `${message}: ${firstField}` : message)
  }

  return value as T
}

/**
 * 密码强度规则：
 * - 至少 8 个字符
 * - 必须包含大写字母、小写字母、数字
 * - 特殊符号可选
 */
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(), // 登录时不强制复杂密码（兼容旧账户）
  remember: Joi.boolean().optional()
})

// 注册/修改密码时使用强密码验证
export const strongPasswordSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().pattern(passwordPattern).required().messages({
    'string.pattern.base': 'ERR_PASSWORD_WEAK'
  }),
  level: Joi.number().integer().min(1).max(3).optional()
})

// 管理员更新用户：无 password 时也必须校验 newUsername/level——level 原样入库曾让
// 非数值（如 "boss"）绕过 requireAdmin 数值比较、newUsername 任意字符可把账号改砖
//（第 27 轮盲审 M1）。min(1) 拒绝空更新。
export const adminUpdateUserSchema = Joi.object({
  newUsername: Joi.string().alphanum().min(3).max(30).optional(),
  password: Joi.string().pattern(passwordPattern).optional().messages({
    'string.pattern.base': 'ERR_PASSWORD_WEAK'
  }),
  level: Joi.number().integer().min(0).max(3).optional()
})
  .min(1)
  // 容忍历史/客户端附带的多余字段（如旧版 username 别名），仅校验上述三个关键字段
  .unknown(true)
  .messages({
    'object.min': '更新内容不能为空'
  })

const accessLevelSchema = Joi.number().integer().min(0).max(3)
const optionalStringSchema = Joi.string().allow('', null)
const optionalParentIdSchema = Joi.number().integer().allow(null).empty('').default(null)

const normalizeValidatedUrl = (
  value: unknown,
  helpers: CustomHelpers,
  { allowRelative = false }: { allowRelative?: boolean } = {}
) => {
  if (!value) {
    return ''
  }

  const normalized = normalizeOptionalUrl(String(value), { allowRelative })
  if (!normalized) {
    return helpers.error('any.invalid')
  }

  return normalized
}

const safeAssetUrlSchema = Joi.string()
  .trim()
  .allow('')
  .custom((value, helpers) => normalizeValidatedUrl(value, helpers, { allowRelative: true }))

// 首页/背景图等 URL 字段与资产 URL 使用同一套安全校验，命名上分开仅为语义可读
const safeHomeUrlSchema = safeAssetUrlSchema

const safeTimezoneSchema = Joi.string()
  .allow('')
  .custom((value, helpers) => {
    if (isAllowedTimezone(value)) {
      return value || ''
    }

    return helpers.error('any.invalid')
  })

export const itemSchema = Joi.object({
  // .positive()：id 为自增主键（恒 ≥1）。此前仅 .integer() 允许 0/负数，
  // 会与前端虚拟"未分类" id=0 撞 id、落库成僵尸行，且与 batchDelete/Move 的
  // .positive() 口径不一致（第 35 轮 G3）。
  id: Joi.number().integer().positive().required(),
  name: Joi.string().trim().required(),
  url: Joi.string().trim().required(), // 移除 uri() 校验，兼容内网 IP 或不规范地址
  description: optionalStringSchema,
  // .integer().min(0)：非整数 categoryId（如 1.5）此前会被 normalizeDbCategoryId
  // 静默归入未分类（第 34 轮 L7），与增量写路径（bookmarkCreateSchema 同款约束）对齐；
  // 0 表示"未分类"。
  categoryId: Joi.number().integer().min(0).required(),
  private: Joi.boolean().default(false),
  pinned: Joi.boolean().default(false),
  level: accessLevelSchema.default(0),
  icon: optionalStringSchema.optional(),
  clickCount: Joi.number().integer().min(0).allow(null).optional(),
  lastVisited: Joi.string().allow(null, '').optional()
}).unknown(true) // 允许未知字段，防止因前端增加额外属性导致保存失败

export const categorySchema = Joi.object({
  // 同 itemSchema.id：自增主键恒 ≥1，拒绝 0/负数（第 35 轮 G3）。
  id: Joi.number().integer().positive().required(),
  name: Joi.string().trim().required(),
  icon: optionalStringSchema.optional(),
  private: Joi.boolean().optional(),
  level: accessLevelSchema.default(0),
  parentId: optionalParentIdSchema.optional()
}).unknown(true)

// 导入数组上界：express.json 的 10mb 只兜住字节量，不能阻止数组长度本身撑爆
// 内存/写事务。5000/20000 为远高于正常个人导航规模、又能挡住 DoS 的量级
//（第 35 轮 G3）。超限由 Joi 落 400。
const categoryListSchema = Joi.array().items(categorySchema).max(5000).required()
const itemListSchema = Joi.array().items(itemSchema).max(20000).required()

const directDataSchema = Joi.object({
  action: Joi.string().allow('').optional(),
  categories: categoryListSchema,
  items: itemListSchema
}).unknown(true)

const wrappedDataSchema = Joi.object({
  action: Joi.string().allow('').optional(),
  content: Joi.object({
    categories: categoryListSchema,
    items: itemListSchema,
    action: Joi.string().allow('').optional()
  })
    .unknown(true)
    .required()
}).unknown(true)

export const dataSchema = Joi.alternatives().try(wrappedDataSchema, directDataSchema)

export const bookmarkCreateSchema = Joi.object({
  name: Joi.string().trim().required(),
  url: Joi.string().trim().required(),
  description: optionalStringSchema.optional(),
  categoryId: Joi.number().integer().required(),
  icon: optionalStringSchema.optional(),
  pinned: Joi.boolean().optional(),
  minLevel: accessLevelSchema.optional(),
  level: accessLevelSchema.optional()
}).unknown(true)

export const bookmarkUpdateSchema = Joi.object({
  name: Joi.string().trim().optional(),
  url: Joi.string().trim().optional(),
  description: optionalStringSchema.optional(),
  categoryId: Joi.number().integer().optional(),
  icon: optionalStringSchema.optional(),
  pinned: Joi.boolean().optional(),
  minLevel: accessLevelSchema.optional(),
  level: accessLevelSchema.optional()
})
  .or('name', 'url', 'description', 'categoryId', 'icon', 'pinned', 'minLevel', 'level')
  .unknown(true)

export const bookmarkMoveSchema = Joi.object({
  categoryId: Joi.number().integer().min(0).required(),
  targetIndex: Joi.number().integer().min(0).required()
}).unknown(false)

export const bookmarkBatchDeleteSchema = Joi.object({
  // max(500)：批量上限（第 30 轮盲审 L5）。超大 ids 会在 better-sqlite3 的 IN(...)
  // 展开时突破变量上限（32766）或撑爆语句，应在校验层 400 拒绝而非落 500
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(500).required()
}).unknown(false)

export const bookmarkBatchMoveSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(500).required(),
  categoryId: Joi.number().integer().min(0).required()
}).unknown(false)

export const categoryCreateSchema = Joi.object({
  name: Joi.string().trim().required(),
  icon: optionalStringSchema.optional(),
  minLevel: accessLevelSchema.optional(),
  level: accessLevelSchema.optional(),
  parentId: optionalParentIdSchema.optional()
}).unknown(true)

export const categoryUpdateSchema = Joi.object({
  name: Joi.string().trim().optional(),
  icon: optionalStringSchema.optional(),
  minLevel: accessLevelSchema.optional(),
  level: accessLevelSchema.optional(),
  parentId: optionalParentIdSchema.optional()
})
  .or('name', 'icon', 'minLevel', 'level', 'parentId')
  .unknown(true)

export const categoryReorderSchema = Joi.object({
  orderedIds: Joi.array().items(Joi.number().integer().positive()).min(1).required()
}).unknown(false)

export const adminSettingsSchema = Joi.object({
  registrationEnabled: Joi.boolean().optional(),
  defaultUserLevel: Joi.number().integer().min(1).max(3).optional(),
  homeUrl: safeHomeUrlSchema.optional(),
  timezone: safeTimezoneSchema.optional(),
  backgroundUrl: safeAssetUrlSchema.optional(),
  footerHtml: Joi.string().allow('').max(2000).optional(),
  siteName: Joi.string().trim().allow('').max(80).optional(),
  logoUrl: safeAssetUrlSchema.optional(),
  faviconUrl: safeAssetUrlSchema.optional()
})
  .min(1)
  .unknown(false)

export const backgroundUrlSchema = Joi.string()
  .trim()
  .allow('')
  .custom((value, helpers) => normalizeValidatedUrl(value, helpers, { allowRelative: true }))
