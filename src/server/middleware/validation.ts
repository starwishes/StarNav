import Joi, { type CustomHelpers } from 'joi'
import { isAllowedTimezone, normalizeOptionalUrl } from '../../shared/security/urlSafety.js'
import { THEME_PRESET_KEYS, normalizeThemeColor } from '../../shared/theme.js'

/**
 * 密码强度规则：
 * - 至少 8 个字符
 * - 必须包含大写字母、小写字母、数字、特殊符号
 */
const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/

export const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(), // 登录时不强制复杂密码（兼容旧账户）
  level: Joi.number().integer().min(1).max(3).optional()
})

// 注册/修改密码时使用强密码验证
export const strongPasswordSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().pattern(passwordPattern).required().messages({
    'string.pattern.base': 'ERR_PASSWORD_WEAK'
  }),
  level: Joi.number().integer().min(1).max(3).optional()
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

const safeHomeUrlSchema = Joi.string()
  .trim()
  .allow('')
  .custom((value, helpers) => normalizeValidatedUrl(value, helpers, { allowRelative: true }))

const safeTimezoneSchema = Joi.string()
  .allow('')
  .custom((value, helpers) => {
    if (isAllowedTimezone(value)) {
      return value || ''
    }

    return helpers.error('any.invalid')
  })

const safeThemeColorSchema = Joi.string()
  .trim()
  .allow('')
  .custom((value, helpers) => {
    const normalized = normalizeThemeColor(value)
    if (!value || normalized) {
      return normalized
    }

    return helpers.error('any.invalid')
  })

export const itemSchema = Joi.object({
  id: Joi.number().required(),
  name: Joi.string().trim().required(),
  url: Joi.string().trim().required(), // 移除 uri() 校验，兼容内网 IP 或不规范地址
  description: optionalStringSchema,
  categoryId: Joi.number().required(),
  private: Joi.boolean().default(false),
  pinned: Joi.boolean().default(false),
  level: accessLevelSchema.default(0),
  icon: optionalStringSchema.optional(),
  clickCount: Joi.number().integer().min(0).allow(null).optional(),
  lastVisited: Joi.string().allow(null, '').optional()
}).unknown(true) // 允许未知字段，防止因前端增加额外属性导致保存失败

export const categorySchema = Joi.object({
  id: Joi.number().required(),
  name: Joi.string().trim().required(),
  icon: optionalStringSchema.optional(),
  private: Joi.boolean().optional(),
  level: accessLevelSchema.default(0),
  parentId: optionalParentIdSchema.optional()
}).unknown(true)

const directDataSchema = Joi.object({
  action: Joi.string().allow('').optional(),
  categories: Joi.array().items(categorySchema).required(),
  items: Joi.array().items(itemSchema).required()
}).unknown(true)

const wrappedDataSchema = Joi.object({
  action: Joi.string().allow('').optional(),
  content: Joi.object({
    categories: Joi.array().items(categorySchema).required(),
    items: Joi.array().items(itemSchema).required(),
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
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).required()
}).unknown(false)

export const bookmarkBatchMoveSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
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
  themePreset: Joi.string()
    .trim()
    .valid(...THEME_PRESET_KEYS)
    .optional(),
  themeColor: safeThemeColorSchema.optional(),
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
