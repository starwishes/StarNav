const HTTP_PROTOCOLS = new Set(['http:', 'https:'])

// 服务端认可的时区白名单（'' = 跟随访客本地时区）。UI 选项与本地化标签由
// src/web/components/admin/systemSettingsHelpers.ts buildTimezoneOptions 维护——
// 两者必须逐项同步：此处是校验侧的单一事实源，前端新增选项须同步加到本清单，
// 否则保存会被 isAllowedTimezone 拒绝；本清单新增亦须同步补对应 locale label。
export const SUPPORTED_TIMEZONES = [
  '',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Moscow',
  'Europe/Paris',
  'Australia/Sydney'
]

const SUPPORTED_TIMEZONE_SET = new Set(SUPPORTED_TIMEZONES)

export const isSafeHttpUrl = (value: string | null | undefined): boolean => {
  if (typeof value !== 'string') {
    return false
  }

  try {
    const url = new URL(value.trim())
    return HTTP_PROTOCOLS.has(url.protocol)
  } catch {
    return false
  }
}

export const isSafeRelativePath = (value: string | null | undefined): boolean => {
  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim()
  return trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')
}

export const normalizeOptionalUrl = (
  value: string | null | undefined,
  { allowRelative = false }: { allowRelative?: boolean } = {}
): string => {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (isSafeHttpUrl(trimmed)) {
    return trimmed
  }

  if (allowRelative && isSafeRelativePath(trimmed)) {
    return trimmed
  }

  return ''
}

export const isAllowedTimezone = (value: string | null | undefined): boolean =>
  SUPPORTED_TIMEZONE_SET.has(value || '')
