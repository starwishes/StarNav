import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createLoadMainModule = async () => {
  vi.resetModules()

  const useMock = vi.fn().mockReturnThis()
  const mountMock = vi.fn()
  const createAppMock = vi.fn(() => ({
    use: useMock,
    mount: mountMock
  }))
  const piniaUseMock = vi.fn()
  const createPiniaMock = vi.fn(() => ({
    use: piniaUseMock
  }))
  const routerStub = { name: 'router-stub' }
  const i18nStub = { name: 'i18n-stub' }
  const appStub = { name: 'app-stub' }

  vi.doMock('vue', () => ({
    createApp: createAppMock
  }))
  vi.doMock('pinia', () => ({
    createPinia: createPiniaMock
  }))
  vi.doMock('pinia-plugin-persistedstate', () => ({
    default: 'persistedstate-plugin'
  }))
  vi.doMock('../../src/web/router/index.ts', () => ({
    default: routerStub
  }))
  vi.doMock('../../src/web/plugins/i18n.ts', () => ({
    default: i18nStub
  }))
  vi.doMock('../../src/web/App.vue', () => ({
    default: appStub
  }))

  await import('../../src/web/main.ts')

  return {
    createAppMock,
    useMock,
    mountMock,
    piniaUseMock,
    routerStub,
    i18nStub,
    appStub
  }
}

describe('frontend main bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clears stale legacy token storage while mounting the app', { timeout: 15_000 }, async () => {
    localStorage.setItem('admin_token', 'stale-token')

    const runtime = await createLoadMainModule()

    expect(localStorage.getItem('admin_token')).toBeNull()
    expect(runtime.mountMock).toHaveBeenCalledWith('#app')
  })

  it('ignores legacy hash token sync links and only trusts stored tokens', async () => {
    const token = `header.${btoa(JSON.stringify({ username: 'hash-admin', level: 2 }))}.signature`
    window.history.replaceState({}, '', `/#token=${encodeURIComponent(token)}`)

    const runtime = await createLoadMainModule()

    expect(localStorage.getItem('admin_token')).toBeNull()
    expect(localStorage.getItem('admin_user')).toBeNull()
    expect(runtime.mountMock).toHaveBeenCalledWith('#app')
  })
})
