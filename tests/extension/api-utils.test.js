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
})
