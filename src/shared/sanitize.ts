/**
 * 文本安全清洗 (Shared Module)
 * 防止 XSS 和非法字符注入
 */

export const escapeHtml = (unsafe: unknown): string => {
  if (typeof unsafe !== 'string') return ''
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export const sanitizeText = (text: unknown, maxLength = 1000): string => {
  if (!text) return ''
  // 非字符串真值（数字等）也走统一管线：trim + 控制字符剥离 + 截断，而不是直接
  // String() 跳过清洗（第 25 轮盲审 L 指出的契约不一致）
  let clean = String(text).trim()
  clean = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')

  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength)
  }

  return clean
}
