export interface DateTimeFormatOptions {
  locale?: string
  timeZone?: string
  fallback?: string
}

export const formatDateTime = (
  value: string | number | Date | null | undefined,
  options: DateTimeFormatOptions = {}
) => {
  const { locale, timeZone, fallback = '-' } = options

  if (!value) {
    return fallback
  }

  const date = value instanceof Date ? value : new Date(value)
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
