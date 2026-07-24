type Translate = (key: string) => string

export const formatHealthStatus = (status: string, t: Translate) => {
  if (status === 'healthy') {
    return t('health.healthy')
  }

  if (status === 'degraded') {
    return t('health.degraded')
  }

  return t('health.unhealthy')
}

export const formatUptime = (seconds: number, t: Translate) => {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}${t('health.uptimeDayUnit')}`)
  if (h > 0) parts.push(`${h}${t('health.uptimeHourUnit')}`)
  if (m > 0 || parts.length === 0) parts.push(`${m}${t('health.uptimeMinuteUnit')}`)
  return parts.join(' ')
}

export const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const formatBooleanState = (value: boolean | undefined, t: Translate) => {
  if (value === undefined) {
    return t('health.unknown')
  }

  return value ? t('health.enabled') : t('health.disabled')
}

export const formatQuickCheck = (value: string | undefined, t: Translate) => {
  if (!value || value === 'unknown') {
    return t('health.unknown')
  }

  return value.toLowerCase() === 'ok' ? t('health.dbIntegrityOk') : value
}

export const formatCookieSecureMode = (
  value: 'auto' | 'always' | 'never' | undefined,
  t: Translate
) => {
  if (value === 'always') {
    return t('health.runtimeCookieAlways')
  }

  if (value === 'never') {
    return t('health.runtimeCookieNever')
  }

  return t('health.runtimeCookieAuto')
}
