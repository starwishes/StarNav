export interface DateTimeFormatOptions {
  locale?: string
  timeZone?: string
  fallback?: string
}

/**
 * 兼容两种存储格式的日期解析：
 * - ISO 8601（`YYYY-MM-DDTHH:MM:SS.sssZ`，按 UTC 解析）
 * - 历史 SQLite `datetime('now')` 空格格式（`YYYY-MM-DD HH:MM:SS`，无时区标记但实际是 UTC）
 * 空格格式若不补 Z，会被 JS 按本地时区解析，导致非 UTC 用户看到时间偏移。
 */
export const parseDateString = (value: string | number | Date): Date => {
  if (value instanceof Date || typeof value === 'number') {
    return new Date(value)
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value.replace(' ', 'T') + 'Z')
  }

  return new Date(value)
}

export const formatDateTime = (
  value: string | number | Date | null | undefined,
  options: DateTimeFormatOptions = {}
) => {
  const { locale, timeZone, fallback = '-' } = options

  if (!value) {
    return fallback
  }

  const date = parseDateString(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      ...(timeZone ? { timeZone } : {})
    }).format(date)
  } catch {
    return date.toLocaleString(locale || undefined)
  }
}
