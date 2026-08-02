import { ApiError, extractApiErrorMessage, readJsonBody, unwrapApiPayload } from '../common/api.js'
import { getMergedStorage } from './storage.js'

let config = { serverUrl: '', token: '' }
let onAuthError = null

export function normalizeServerUrl(serverUrl) {
  return String(serverUrl || '')
    .trim()
    .replace(/\/+$/, '')
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
    const response = await fetch(buildApiUrl(config.serverUrl, endpoint), {
      ...options,
      headers: { ...headers, ...options.headers }
    })
    const data = await readJsonBody(response)
    const message = extractApiErrorMessage(data, response.status)

    if (response.status === 401) {
      if (onAuthError) onAuthError(message)
      throw new ApiError(message, { status: response.status, payload: data })
    }

    if (!response.ok) throw new ApiError(message, { status: response.status, payload: data })
    return unwrapApiPayload(data)
  } catch (error) {
    // 网络错误等
    throw error
  }
}

export async function publicApiRequest(serverUrl, endpoint, options = {}) {
  const response = await fetch(buildApiUrl(serverUrl, endpoint), options)
  const data = await readJsonBody(response)

  if (!response.ok) {
    throw new ApiError(extractApiErrorMessage(data, response.status), {
      status: response.status,
      payload: data
    })
  }

  return unwrapApiPayload(data)
}

export async function authenticatedPublicApiRequest(serverUrl, token, endpoint, options = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers
  }

  if (!headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json'
  }

  return publicApiRequest(serverUrl, endpoint, {
    ...options,
    headers
  })
}

export async function loginToServer(serverUrl, username, password) {
  return publicApiRequest(serverUrl, '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
}

export async function checkHealth(serverUrl) {
  return publicApiRequest(serverUrl, '/health')
}

export async function validateSession(serverUrl, token) {
  return authenticatedPublicApiRequest(serverUrl, token, '/sessions')
}
