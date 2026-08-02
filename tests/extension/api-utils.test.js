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
    expect(onAuthError).toHaveBeenCalledWith('令牌已过期')
  })

  it('can validate a stored token through an authenticated public helper', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          sessions: [{ id: 'session-1' }]
        }
      })
    })

    const { validateSession } = await import('../../clients/extension/utils/api.js')

    await expect(validateSession('https://nav.example.com', 'secret-token')).resolves.toEqual({
      sessions: [{ id: 'session-1' }]
    })
    expect(global.fetch).toHaveBeenCalledWith('https://nav.example.com/api/sessions', {
      headers: {
        Authorization: 'Bearer secret-token'
      }
    })
  })
})
