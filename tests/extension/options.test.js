/* global document, window */
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loginToServer = vi.fn()
const checkHealth = vi.fn()
const validateSession = vi.fn()
const normalizeServerUrl = vi.fn((value) => String(value).trim().replace(/\/+$/, ''))

vi.mock('../../clients/extension/utils/api.js', () => ({
  loginToServer,
  checkHealth,
  validateSession,
  normalizeServerUrl
}))

const renderOptionsDom = () => {
  document.body.innerHTML = `
    <input id="serverUrl" />
    <input id="username" />
    <input id="password" />
    <button id="saveBtn">保存并连接</button>
    <button id="testBtn">测试连接</button>
    <div id="statusBox" class="status disconnected"></div>
    <span id="statusIcon"></span>
    <span id="statusText"></span>
    <div id="toast"></div>
  `
}

const createStorageArea = (state) => ({
  get: vi.fn((keys, callback) => {
    const requestedKeys = Array.isArray(keys) ? keys : [keys]
    const result = Object.fromEntries(
      requestedKeys.filter((key) => key in state).map((key) => [key, state[key]])
    )
    callback(result)
  }),
  set: vi.fn((data, callback) => {
    Object.assign(state, data)
    callback?.()
  }),
  remove: vi.fn((keys, callback) => {
    const requestedKeys = Array.isArray(keys) ? keys : [keys]
    requestedKeys.forEach((key) => {
      delete state[key]
    })
    callback?.()
  })
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('browser extension options runtime', () => {
  let syncState
  let localState

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    renderOptionsDom()

    syncState = {}
    localState = {}

    global.chrome = {
      storage: {
        sync: createStorageArea(syncState),
        local: createStorageArea(localState)
      },
      tabs: {
        create: vi.fn()
      }
    }

    window.confirm = vi.fn(() => false)
    loginToServer.mockReset()
    checkHealth.mockReset()
    validateSession.mockReset()
    normalizeServerUrl.mockClear()

    await import('../../clients/extension/options/options.js')
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await flush()
  })

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete global.chrome
    document.body.innerHTML = ''
  })

  it('connects and persists credentials through shared api helpers', async () => {
    loginToServer.mockResolvedValue({
      token: 'signed-token',
      user: { login: 'alice' }
    })

    document.getElementById('serverUrl').value = 'https://nav.example.com/'
    document.getElementById('username').value = 'alice'
    document.getElementById('password').value = 'secret'
    document.getElementById('saveBtn').click()

    await flush()
    await flush()
    await flush()
    await flush()

    expect(normalizeServerUrl).toHaveBeenCalledWith('https://nav.example.com/')
    expect(loginToServer).toHaveBeenCalledWith('https://nav.example.com', 'alice', 'secret')
    expect(syncState.serverUrl).toBe('https://nav.example.com')
    expect(syncState.savedUsername).toBe('alice')
    expect(localState.token).toBe('signed-token')
    expect(localState.user).toEqual({ login: 'alice' })
    expect(document.getElementById('password').value).toBe('')
    expect(document.documentElement.getAttribute('lang')).toBe('en')
    expect(document.documentElement.getAttribute('theme-mode')).toBe('light')
    expect(document.getElementById('statusText').textContent).toContain('Connected')
  })

  it('shows a connected state for a valid stored session', async () => {
    document.body.innerHTML = ''
    renderOptionsDom()

    syncState = {
      serverUrl: 'https://nav.example.com',
      savedUsername: 'alice'
    }
    localState = {
      token: 'saved-token',
      user: { login: 'alice' }
    }

    global.chrome = {
      storage: {
        sync: createStorageArea(syncState),
        local: createStorageArea(localState)
      },
      tabs: {
        create: vi.fn()
      }
    }

    validateSession.mockResolvedValue({
      sessions: [{ id: 'session-1' }]
    })

    vi.resetModules()
    await import('../../clients/extension/options/options.js')
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await flush()
    await flush()

    expect(validateSession).toHaveBeenCalledWith('https://nav.example.com', 'saved-token')
    expect(document.getElementById('statusText').textContent).toContain('Connected (alice)')
  })

  it('tests connectivity through the shared health helper', async () => {
    checkHealth.mockResolvedValue({ version: '2.5.0' })

    document.getElementById('serverUrl').value = 'https://nav.example.com/'
    document.getElementById('testBtn').click()

    await flush()
    await flush()
    await flush()

    expect(normalizeServerUrl).toHaveBeenCalledWith('https://nav.example.com/')
    expect(checkHealth).toHaveBeenCalledWith('https://nav.example.com')
    expect(document.getElementById('toast').textContent).toContain('Server is healthy')
  })

  it('clears stale saved auth when the stored token is no longer valid', async () => {
    document.body.innerHTML = ''
    renderOptionsDom()

    syncState = {
      serverUrl: 'https://nav.example.com',
      savedUsername: 'alice'
    }
    localState = {
      token: 'expired-token',
      user: { login: 'alice' }
    }

    global.chrome = {
      storage: {
        sync: createStorageArea(syncState),
        local: createStorageArea(localState)
      },
      tabs: {
        create: vi.fn()
      }
    }

    validateSession.mockRejectedValue({
      status: 401,
      message: '令牌已过期'
    })

    vi.resetModules()
    await import('../../clients/extension/options/options.js')
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await flush()
    await flush()
    await flush()
    await flush()

    expect(validateSession).toHaveBeenCalledWith('https://nav.example.com', 'expired-token')
    expect(localState.token).toBeUndefined()
    expect(localState.user).toBeUndefined()
    expect(document.getElementById('statusText').textContent).toContain('Session expired')
    expect(document.getElementById('toast').textContent).toContain('令牌已过期')
  })
})
