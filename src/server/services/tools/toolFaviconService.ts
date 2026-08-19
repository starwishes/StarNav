import { errors } from '../../middleware/errorHandler.js'
import { sendPayload } from '../../utils/response.js'

const faviconCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>()
const FAVICON_CACHE_TTL = 24 * 60 * 60 * 1000
const FAVICON_CACHE_MAX_ENTRIES = 256
const FAVICON_FETCH_TIMEOUT_MS = 2000

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

const fetchFaviconFromService = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(FAVICON_FETCH_TIMEOUT_MS) })

  if (!response.ok) {
    throw new Error('Failed')
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length <= 100) {
    throw new Error('Failed')
  }

  return {
    data: buffer,
    type: response.headers.get('content-type') || 'image/x-icon'
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

      const services = [
        `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
        `https://icons.duckduckgo.com/ip3/${hostname}.ico`
      ]

      const result = await Promise.any(services.map((url) => fetchFaviconFromService(url)))

      faviconCache.set(hostname, {
        data: result.data,
        contentType: result.type,
        timestamp: Date.now()
      })
      evictFaviconCache()

      return sendPayload(result.data, { 'Content-Type': result.type })
    } catch {
      return faviconNotFoundPayload()
    }
  }
}
