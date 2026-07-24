import { errors } from '../../middleware/errorHandler.js'
import { normalizePublicHttpUrl } from '../../utils/networkTargetSafety.js'

const LINK_CHECK_TIMEOUT_MS = 5000
const MAX_LINK_CHECK_URLS = 20

export const toolLinkCheckService = {
  async checkLinks(urls: unknown) {
    if (!Array.isArray(urls)) {
      throw errors.badRequest('Invalid URLs')
    }

    if (urls.length < 1 || urls.length > MAX_LINK_CHECK_URLS) {
      throw errors.badRequest(`一次最多检测 ${MAX_LINK_CHECK_URLS} 个链接`)
    }

    const stringUrls = urls.map((url) => String(url))

    const normalizedEntries = await Promise.all(
      stringUrls.map(async (url) => ({
        originalUrl: url,
        normalizedUrl: await normalizePublicHttpUrl(url)
      }))
    )

    const results = await Promise.all(
      normalizedEntries.map(async ({ originalUrl, normalizedUrl }) => {
        try {
          const response = await fetch(normalizedUrl, {
            method: 'HEAD',
            redirect: 'manual',
            signal: AbortSignal.timeout(LINK_CHECK_TIMEOUT_MS)
          })
          return {
            url: originalUrl,
            status:
              response.ok || (response.status >= 300 && response.status < 400) ? 'ok' : 'error'
          }
        } catch {
          return { url: originalUrl, status: 'error' }
        }
      })
    )

    return { results }
  }
}
