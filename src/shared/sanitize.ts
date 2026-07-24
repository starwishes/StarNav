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
  if (typeof text !== 'string') return String(text)

  let clean = text.trim()
  clean = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')

  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength)
  }

  return clean
}

export const isValidUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username)
}
