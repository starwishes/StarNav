import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createStorageArea = (state) => ({
  get: vi.fn((keys, callback) => {
    const requestedKeys = Array.isArray(keys) ? keys : [keys]
    const result = Object.fromEntries(
      requestedKeys.filter((key) => key in state).map((key) => [key, state[key]])
    )
    callback(result)
  })
})

describe('browser extension api utils', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete global.chrome
  })

  it('unwraps login envelopes through the shared public request helper', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          token: 'signed-token',
          user: { login: 'alice' }
        }
      })
    })

    const { loginToServer } = await import('../../clients/extension/utils/api.js')

    await expect(loginToServer('https://nav.example.com', 'alice', 'secret')).resolves.toEqual({
      token: 'signed-token',
      user: { login: 'alice' }
    })
  })

  it('refuses to send credentials to non-https, non-loopback origins', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })

    const { loginToServer } = await import('../../clients/extension/utils/api.js')

    await expect(loginToServer('http://nav.example.com', 'alice', 'secret')).rejects.toThrow(
      /HTTPS/
    )
    await expect(loginToServer('ftp://nav.example.com', 'alice', 'secret')).rejects.toThrow(/HTTPS/)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('normalizes auth failures and forwards the shared error message to the callback', async () => {
    global.chrome = {
      storage: {
        sync: createStorageArea({ serverUrl: 'https://nav.example.com', token: 'secret-token' }),
        local: createStorageArea({})
      }
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: '令牌已过期'
      })
    })

    const onAuthError = vi.fn()
    const { initApi, apiRequest } = await import('../../clients/extension/utils/api.js')

    await initApi(onAuthError)

    await expect(apiRequest('/data')).rejects.toMatchObject({
      name: 'ApiError',
      message: '令牌已过期',
      status: 401
    })
    expect(onAuthError).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ApiError', message: '令牌已过期', status: 401 })
    )
  })

  it('rethrows native network errors unwrapped and neutralizes them at display sites', async () => {
    global.chrome = {
      storage: {
        sync: createStorageArea({ serverUrl: 'https://nav.example.com', token: 'secret-token' }),
        local: createStorageArea({})
      }
    }
    // 网络层失败的真实形态：fetch 本身 reject（连接失败/超时），message 是引擎内部文本
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    const { ApiError } = await import('../../clients/extension/common/api.js')
    const { initApi, apiRequest, getErrorMessage } =
      await import('../../clients/extension/utils/api.js')
    await initApi(() => {})

    // 必须保持原生 Error 形态：若包成 ApiError，显示侧 getErrorMessage 会把引擎原文
    // （Failed to fetch 等）当业务文案上屏（第 23 轮审查）
    await expect(apiRequest('/bookmark/search')).rejects.toBeInstanceOf(TypeError)

    // 展示点判定：原生网络错误 → 本地化 fallback；服务端信封 ApiError → message 保留；
    // 显式字符串 → 透传
    expect(getErrorMessage(new TypeError('Failed to fetch'), '删除失败')).toBe('删除失败')
    expect(getErrorMessage(new ApiError('名称冲突', { status: 400 }), '删除失败')).toBe('名称冲突')
    expect(getErrorMessage('显式字符串', '删除失败')).toBe('显式字符串')
  })
})
