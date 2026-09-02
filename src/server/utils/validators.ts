/**
 * 通用验证工具模块
 * 提供统一的数据验证方法，用于 Controller 层输入验证
 */

/**
 * URL 格式验证
 * @param url - 待验证的 URL
 * @returns 是否为有效的 HTTP/HTTPS URL（要求可解析且有实际主机，拒绝空主机/畸形输入）
 */
function isValidUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url) {
    return false
  }

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 密码强度验证
 * @param password - 密码
 * @returns 是否满足最低强度要求 (至少8字符)
 */
function isStrongPassword(password: unknown): boolean {
  return typeof password === 'string' && Boolean(password) && password.length >= 8
}

/**
 * 非空字符串验证
 * @param str - 待验证的值
 * @returns 是否为非空字符串
 */
function isNonEmptyString(str: unknown): boolean {
  return typeof str === 'string' && Boolean(str) && str.trim().length > 0
}

/**
 * 整数范围验证
 * @param value - 待验证的值
 * @param min - 最小值 (包含)
 * @param max - 最大值 (包含)
 * @returns 是否为指定范围内的整数
 */
function isIntegerInRange(value: unknown, min: number, max: number): boolean {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max
}

/**
 * 用户权限级别验证
 * @param level - 权限级别
 * @returns 是否为有效的权限级别 (0-3)
 */
function isValidUserLevel(level: unknown): boolean {
  return isIntegerInRange(level, 0, 3)
}

/**
 * 电子邮件格式验证
 * @param email - 电子邮件地址
 * @returns 是否为有效的电子邮件格式
 */
function isValidEmail(email: unknown): boolean {
  if (!email || typeof email !== 'string') return false
  // 基本的邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 分类 ID 验证
 * @param categoryId - 分类 ID
 * @returns 是否为有效的分类 ID (正整数)
 */
function isValidCategoryId(categoryId: unknown): boolean {
  return Number.isInteger(categoryId) && (categoryId as number) > 0
}

/**
 * JSON 字符串验证
 * @param str - JSON 字符串
 * @returns 是否为有效的 JSON 格式
 */
function isValidJSON(str: unknown): boolean {
  if (typeof str !== 'string') return false
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

export const validators = {
  isValidUrl,
  isStrongPassword,
  isNonEmptyString,
  isIntegerInRange,
  isValidUserLevel,
  isValidEmail,
  isValidCategoryId,
  isValidJSON
}
