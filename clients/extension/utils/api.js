import { ApiError, extractApiErrorMessage, readJsonBody, unwrapApiPayload } from '../common/api.js'
import { getMergedStorage } from './storage.js'
import { isAllowedLoginOrigin, normalizeServerUrl } from './url.js'

// 保持向后兼容:popup 仍从 api.js 导入
export { isAllowedLoginOrigin, normalizeServerUrl }

let config = { serverUrl: '', token: '' }
let onAuthError = null

const REQUEST_TIMEOUT_MS = 15_000

/** 合并超时信号：调用方已传 signal 时不覆盖 */
function buildTimeoutSignal(options = {}) {
  if (options.signal || typeof AbortSignal?.timeout !== 'function') {
    return options
  }
  return { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
}

function buildApiUrl(serverUrl, endpoint) {
  const normalizedServerUrl = normalizeServerUrl(serverUrl)

  if (!normalizedServerUrl) {
    throw new Error('未配置服务器地址')
  }

  return `${normalizedServerUrl}/api${endpoint}`
}

/**
 * 初始化 API 配置
 */
export async function initApi(authErrorCallback) {
  const stored = await getMergedStorage(['serverUrl', 'token'])

  config.serverUrl = stored.serverUrl || ''
  config.token = stored.token || ''
  onAuthError = authErrorCallback
  return config
}

/**
 * UI 上屏错误文案的统一判定（第 23 轮审查：与 Web 端 utils/errors.getErrorMessage
 * 对齐，收口扩展 catch 里 `error.message || fallback` 直展原文的幸存者——网络层
 * 'Failed to fetch' / 超时等引擎原文会突兀出现在 toast 上）。
 *
 * 工具模块无 i18n 上下文，fallback 由调用方按当前语言传入本地化兜底文案。
 * 分类规则：
 * - ApiError（api.js 对非 2xx 服务端响应抛出的业务错误，message = 服务端 envelope
 *   业务文案）→ 原样上屏；
 * - 显式字符串 → 原样透传；
 * - 其余值（网络层 TypeError/DOMException、未知形态）→ 一律返回调用方 fallback，
 *   不把 message 上屏。
 */
export const getErrorMessage = (error, fallback) => {
  if (typeof error === 'string') {
    return error || fallback
  }

  if (error instanceof ApiError) {
    return error.message || fallback
  }

  return fallback
}

/**
 * 发送 API 请求
 */
export async function apiRequest(endpoint, options = {}) {
  if (!config.serverUrl || !config.token) {
    throw new Error('未配置服务器地址或 Token')
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.token}`
  }

  // 注意：fetch 网络层失败（TypeError: Failed to fetch / 超时 DOMException 等）不再在
  // 这里包成 ApiError 保留原文——那会让显示侧把引擎原文当业务文案上屏（第 23 轮审查）。
  // 非 2xx 的服务端信封错误以 ApiError 抛出（业务文案保留）；网络错误原样上抛，由
  // 显示侧经 getErrorMessage(error, localizedFallback) 收口为本地化兜底文案。
  const response = await fetch(
    buildApiUrl(config.serverUrl, endpoint),
    buildTimeoutSignal({
      ...options,
      headers: { ...headers, ...options.headers }
    })
  )
  const data = await readJsonBody(response)
  const message = extractApiErrorMessage(data, response.status)

  if (response.status === 401) {
    const authError = new ApiError(message, { status: response.status, payload: data })
    if (onAuthError) onAuthError(authError)
    throw authError
  }

  if (!response.ok) throw new ApiError(message, { status: response.status, payload: data })
  return unwrapApiPayload(data)
}

export async function publicApiRequest(serverUrl, endpoint, options = {}) {
  const response = await fetch(buildApiUrl(serverUrl, endpoint), buildTimeoutSignal(options))
  const data = await readJsonBody(response)

  if (!response.ok) {
    throw new ApiError(extractApiErrorMessage(data, response.status), {
      status: response.status,
      payload: data
    })
  }

  return unwrapApiPayload(data)
}

export async function loginToServer(serverUrl, username, password, remember = false) {
  if (!isAllowedLoginOrigin(serverUrl)) {
    // 扩展会把凭据 POST 到该 origin；拒绝非 HTTPS / 非本地回环的明文目标。
    throw new Error('仅允许连接 HTTPS 或本地回环地址（http://127.0.0.1 / localhost）')
  }

  return publicApiRequest(serverUrl, '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, remember: remember === true })
  })
}
