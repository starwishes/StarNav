const normalizeIconCandidate = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

export const DEFAULT_APP_ICON = '/logo.svg?v=2'

const UNAVAILABLE_ICON_CACHE_PREFIX = 'starnav:icon-unavailable:v2:'
const UNAVAILABLE_ICON_TTL_MS = 7 * 24 * 60 * 60 * 1000

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

const getUnavailableIconCacheKey = (targetUrl: string, explicitIcon = '', proxyIcon = '') => {
  const signature = JSON.stringify([
    normalizeIconCandidate(targetUrl),
    normalizeIconCandidate(explicitIcon),
    normalizeIconCandidate(proxyIcon)
  ])

  return `${UNAVAILABLE_ICON_CACHE_PREFIX}${encodeURIComponent(signature)}`
}

const hasUnavailableIconCache = (targetUrl: string, explicitIcon = '', proxyIcon = '') => {
  const storage = getStorage()

  if (!storage) {
    return false
  }

  try {
    const cacheKey = getUnavailableIconCacheKey(targetUrl, explicitIcon, proxyIcon)
    const rawValue = storage.getItem(cacheKey)

    if (!rawValue) {
      return false
    }

    const parsed = JSON.parse(rawValue) as { expiresAt?: number }

    if (typeof parsed?.expiresAt === 'number' && parsed.expiresAt > Date.now()) {
      return true
    }

    storage.removeItem(cacheKey)
  } catch {
    return false
  }

  return false
}

const buildOriginFaviconUrl = (targetUrl: string) => {
  try {
    const parsed = new URL(targetUrl)
    return `${parsed.origin}/favicon.ico`
  } catch {
    return ''
  }
}

export const buildProxyIconCandidate = (targetUrl: string, proxyPrefix = '') => {
  const normalizedPrefix = normalizeIconCandidate(proxyPrefix)

  if (!normalizedPrefix) {
    return ''
  }

  try {
    new URL(targetUrl)
    return `${normalizedPrefix}${targetUrl}`
  } catch {
    return ''
  }
}

export const isRenderableIconUrl = (url: string) => {
  if (!url) {
    return false
  }

  return url.startsWith('http') || url.startsWith('/') || url.startsWith('data:')
}

export const buildIconCandidates = (
  targetUrl: string,
  explicitIcon = '',
  proxyIcon = '',
  fallbackIcon = DEFAULT_APP_ICON
) => {
  if (hasUnavailableIconCache(targetUrl, explicitIcon, proxyIcon)) {
    return isRenderableIconUrl(fallbackIcon) ? [fallbackIcon] : []
  }

  return [
    normalizeIconCandidate(explicitIcon),
    buildOriginFaviconUrl(targetUrl),
    normalizeIconCandidate(proxyIcon),
    normalizeIconCandidate(fallbackIcon)
  ].filter(
    (candidate, index, list) => isRenderableIconUrl(candidate) && list.indexOf(candidate) === index
  )
}

export const markIconUnavailable = (targetUrl: string, explicitIcon = '', proxyIcon = '') => {
  const storage = getStorage()

  if (!storage) {
    return
  }

  try {
    const cacheKey = getUnavailableIconCacheKey(targetUrl, explicitIcon, proxyIcon)
    storage.setItem(
      cacheKey,
      JSON.stringify({
        expiresAt: Date.now() + UNAVAILABLE_ICON_TTL_MS
      })
    )
  } catch {
    // Ignore storage failures and keep runtime fallback behavior only.
  }
}
