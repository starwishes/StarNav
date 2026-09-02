import { ApiError, extractApiErrorMessage, readJsonBody, unwrapApiPayload } from '../common/api.js'
import { getMergedStorage } from './storage.js'
import { isAllowedLoginOrigin, normalizeServerUrl } from './url.js'

// 保持向后兼容:popup/options 仍从 api.js 导入
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

  try {
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
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    // 网络/超时错误：转成可读错误（不再原样吞掉再抛同一对象）
    throw new ApiError(error?.message || '网络请求失败', {})
  }
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
