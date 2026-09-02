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
    // The target becomes a query value on the proxy endpoint; URL-encode it so
    // ampersands/quotes/etc. cannot break out of the query string.
    return `${normalizedPrefix}${encodeURIComponent(targetUrl)}`
  } catch {
    return ''
  }
}

export const isRenderableIconUrl = (url: string) => {
  if (!url) {
    return false
  }

  // data: 仅允许图片类型（data:image/...），data:text/html 等禁止作为图标源
  return url.startsWith('http') || url.startsWith('/') || url.startsWith('data:image/')
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

  // 候选顺序取舍（第 16 轮审查确认，有意为之）：
  // [explicit → 第三方 origin 直连 /favicon.ico → 代理 → 兜底]。
  // - origin-first：由浏览器直接拉取站点图标，命中浏览器 HTTP 缓存时不产生任何服务端
  //   往返，避免首页成百卡片同时触发 /api/favicon（受 faviconLimiter 按 IP 限流配额）
  //   打满配额或撑爆代理缓存；origin 404/失败后由 onerror 推进到代理。
  // - 隐私/性能权衡：origin 直连会向目标站点暴露客户端 IP 与访问行为，但本应用是
  //   单租户自托管（客户端本就持有全部站点 URL），且只在 origin 图标缺失时才走
  //   代理/第三方图标 CDN，不扩大暴露面。
  // - 不要改为代理优先：那会使每次首页渲染都消费 /api/favicon 配额并串行化图标加载。
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
