/**
 * URL 规范化（服务器地址专用）
 *
 * 注意：书签 URL 的规范化逻辑以 `src/shared/url.ts` 为单一事实来源，
 * 通过 `npm run extension:sync-common` 同步到 `common/url.js`。
 * 本文件仅保留扩展特有的"服务器地址"处理。
 */

/** 去掉尾部斜杠，返回干净的服务器根地址（不做协议校验，交给上层处理）。 */
export const normalizeServerUrl = (serverUrl) =>
  String(serverUrl || '')
    .trim()
    .replace(/\/+$/, '')

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

/**
 * 登录目标校验：仅允许 HTTPS，或本地回环的 HTTP。
 * 扩展会把用户名/密码 POST 到该 origin，绝不能允许发送到任意明文 http 站点。
 */
export const isAllowedLoginOrigin = (serverUrl) => {
  const normalized = normalizeServerUrl(serverUrl)
  if (!normalized) {
    return false
  }

  let parsed
  try {
    parsed = new URL(normalized)
  } catch {
    return false
  }

  if (parsed.protocol === 'https:') {
    return true
  }
  if (parsed.protocol !== 'http:') {
    return false
  }

  const host = parsed.hostname
  return LOOPBACK_HOSTS.has(host) || LOOPBACK_HOSTS.has(`[${host}]`)
}
