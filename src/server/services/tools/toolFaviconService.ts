import { errors } from '../../utils/errors.js'
import { sendPayload } from '../../utils/response.js'

const faviconCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>()
/** 同 hostname 并发回源去重：一次在途回源供所有并发调用方共享，完成后清理。 */
const inflightFavicon = new Map<string, Promise<{ data: Buffer; type: string }>>()
const FAVICON_CACHE_TTL = 24 * 60 * 60 * 1000
const FAVICON_CACHE_MAX_ENTRIES = 256
const FAVICON_FETCH_TIMEOUT_MS = 2000
const FAVICON_MAX_BYTES = 512 * 1024 // 第三方 favicon 上限，防止无限缓冲

// 有界缓存：过期条目即时清除；超出上限时按最旧优先逐出，防止公开端点内存无限增长
const evictFaviconCache = () => {
  const now = Date.now()
  for (const [key, entry] of faviconCache) {
    if (now - entry.timestamp >= FAVICON_CACHE_TTL) {
      faviconCache.delete(key)
    }
  }

  while (faviconCache.size > FAVICON_CACHE_MAX_ENTRIES) {
    let oldestKey: string | null = null
    let oldestTimestamp = Infinity
    for (const [key, entry] of faviconCache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }
    if (oldestKey === null) break
    faviconCache.delete(oldestKey)
  }
}

const normalizeHostname = (targetUrl: string) =>
  new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`).hostname

const readBodyWithLimit = async (response: Response, maxBytes: number): Promise<Buffer> => {
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > maxBytes) {
      throw new Error('TooLarge')
    }
    return buffer
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      total += value.byteLength
      if (total > maxBytes) {
        throw new Error('TooLarge')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  return Buffer.concat(chunks, total)
}

const FAVICON_ALLOWED_CONTENT_TYPES = new Set([
  'image/png',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/webp',
  'image/gif',
  'image/jpeg'
])

const fetchFaviconFromService = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(FAVICON_FETCH_TIMEOUT_MS) })

  if (!response.ok) {
    throw new Error('Failed')
  }

  const buffer = await readBodyWithLimit(response, FAVICON_MAX_BYTES)
  if (buffer.length <= 100) {
    throw new Error('Failed')
  }

  // 上游 content-type 原样透传会污染响应头（如 text/html/application/octet-stream），
  // 而 image/svg+xml 可内嵌脚本，同源反射存在 XSS 面——一律不放行。
  // 白名单收窄为显式位图图标类型列表（第 16 轮审查：由 /^image\// 泛放行改为显式枚举），
  // 取 content-type 的 mime 主部（忽略 ; charset= 等参数）比对，不匹配回退 image/x-icon。
  const rawContentType = response.headers.get('content-type') || ''
  const mimeType = rawContentType.split(';')[0].trim().toLowerCase()
  const contentType = FAVICON_ALLOWED_CONTENT_TYPES.has(mimeType) ? rawContentType : 'image/x-icon'

  return {
    data: buffer,
    type: contentType
  }
}

const faviconNotFoundPayload = () => ({
  statusCode: 404,
  body: {
    error: 'Not found'
  }
})

export const toolFaviconService = {
  async getFavicon(targetUrl: string) {
    if (!targetUrl) {
      throw errors.badRequest('缺少 URL')
    }

    try {
      const hostname = normalizeHostname(targetUrl)
      evictFaviconCache()
      const cached = faviconCache.get(hostname)

      if (cached && Date.now() - cached.timestamp < FAVICON_CACHE_TTL) {
        return sendPayload(cached.data, { 'Content-Type': cached.contentType })
      }

      const inflight = inflightFavicon.get(hostname)
      if (inflight) {
        const result = await inflight
        return sendPayload(result.data, { 'Content-Type': result.type })
      }

      const promise = (async () => {
        // hostname 已由 new URL(...).hostname 归一（punycode/去端口），encodeURIComponent
        // 兜底防止残留在 hostname 中的特殊字符（& 等）注入上游 URL 参数（第 16 轮审查）。
        const services = [
          `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`,
          `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`
        ]
        return Promise.any(services.map((url) => fetchFaviconFromService(url)))
      })()

      inflightFavicon.set(hostname, promise)
      try {
        const result = await promise
        faviconCache.set(hostname, {
          data: result.data,
          contentType: result.type,
          timestamp: Date.now()
        })
        evictFaviconCache()
        return sendPayload(result.data, { 'Content-Type': result.type })
      } finally {
        inflightFavicon.delete(hostname)
      }
    } catch {
      return faviconNotFoundPayload()
    }
  }
}
