import http from 'node:http'
import https from 'node:https'

import { errors } from '../../utils/errors.js'
import { resolvePublicHttpTarget } from '../../utils/networkTargetSafety.js'

const LINK_CHECK_TIMEOUT_MS = 5000
const MAX_LINK_CHECK_URLS = 20

/**
 * 发起 HEAD 请求并直连已解析并校验过的固定 IP（自定义 `lookup`），
 * 避免 fetch 二次解析导致的 DNS rebinding SSRF。Host 头与 TLS SNI 仍取
 * 原始域名，因此证书校验与虚拟主机语义不受影响。
 */
const requestHead = (url: string, address: string, family: number) => {
  return new Promise<{ statusCode: number }>((resolve, reject) => {
    const parsed = new URL(url)
    const transport = parsed.protocol === 'https:' ? https : http

    const req = transport.request(
      parsed,
      {
        method: 'HEAD',
        agent: false,
        timeout: LINK_CHECK_TIMEOUT_MS,
        lookup: (_hostname, _options, callback) => {
          callback(null, address, family)
        },
        headers: { 'User-Agent': 'StarNav-LinkCheck/1.0' }
      },
      (res) => {
        res.resume()
        resolve({ statusCode: res.statusCode ?? 0 })
      }
    )

    req.on('timeout', () => {
      req.destroy(new Error('timeout'))
    })
    req.on('error', reject)
  })
}

export const toolLinkCheckService = {
  async checkLinks(urls: unknown) {
    if (!Array.isArray(urls)) {
      throw errors.badRequest('Invalid URLs')
    }

    if (urls.length < 1 || urls.length > MAX_LINK_CHECK_URLS) {
      throw errors.badRequest(`一次最多检测 ${MAX_LINK_CHECK_URLS} 个链接`)
    }

    const stringUrls = urls.map((url) => String(url))

    // 逐条解析：单个非法 URL 只记为 error，不拖垮整批（与 fetch 阶段的逐条语义一致）
    const results = await Promise.all(
      stringUrls.map(async (originalUrl) => {
        let target: Awaited<ReturnType<typeof resolvePublicHttpTarget>>
        try {
          target = await resolvePublicHttpTarget(originalUrl)
        } catch {
          return { url: originalUrl, status: 'error' as const }
        }

        try {
          const response = await requestHead(target.url, target.address, target.family)
          const status = response.statusCode >= 200 && response.statusCode < 400 ? 'ok' : 'error'
          return { url: originalUrl, status }
        } catch {
          return { url: originalUrl, status: 'error' as const }
        }
      })
    )

    return { results }
  }
}
