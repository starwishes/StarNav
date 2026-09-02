import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createLoadMainModule = async (options: { themeMode?: string } = {}) => {
  vi.resetModules()

  const applyThemeModeMock = vi.fn()
  const getStoredThemeModeMock = vi.fn(() => options.themeMode ?? 'light')
  const recoverFromStaleAssetsMock = vi.fn().mockResolvedValue('recovered')
  const clearStaleAssetRecoveryFlagMock = vi.fn()
  const notifyUnexpectedErrorMock = vi.fn()
  const notifyStaleAssetReloadNeededMock = vi.fn()
  let swOptions: Record<string, unknown> | undefined
  const registerSWMock = vi.fn((options: Record<string, unknown>) => {
    swOptions = options
    return vi.fn()
  })
  const loggerMock = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }
  const swEventListenerMock = vi.fn()

  const useMock = vi.fn().mockReturnThis()
  const mountMock = vi.fn()
  const appMock = {
    config: {} as Record<string, unknown>,
    use: useMock,
    mount: mountMock
  }
  const createAppMock = vi.fn(() => appMock)
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
  vi.doMock('../../src/web/utils/theme.ts', () => ({
    applyThemeMode: applyThemeModeMock,
    getStoredThemeMode: getStoredThemeModeMock
  }))
  vi.doMock('../../src/web/utils/staleAssetRecovery.ts', () => ({
    recoverFromStaleAssets: recoverFromStaleAssetsMock,
    clearStaleAssetRecoveryFlag: clearStaleAssetRecoveryFlagMock
  }))
  vi.doMock('../../src/web/utils/unexpectedErrorFeedback.ts', () => ({
    notifyUnexpectedError: notifyUnexpectedErrorMock,
    notifyStaleAssetReloadNeeded: notifyStaleAssetReloadNeededMock
  }))
  vi.doMock('virtual:pwa-register', () => ({
    registerSW: registerSWMock
  }))
  vi.doMock('../../src/shared/logger.js', () => ({
    createScopedLogger: () => loggerMock
  }))

  await import('../../src/web/main.ts')

  return {
    createAppMock,
    useMock,
    mountMock,
    appMock,
    piniaUseMock,
    routerStub,
    i18nStub,
    appStub,
    applyThemeModeMock,
    getStoredThemeModeMock,
    recoverFromStaleAssetsMock,
    clearStaleAssetRecoveryFlagMock,
    notifyUnexpectedErrorMock,
    notifyStaleAssetReloadNeededMock,
    registerSWMock,
    swOptions,
    loggerMock,
    swEventListenerMock
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

  it('applies the stored theme mode on bootstrap', { timeout: 15_000 }, async () => {
    const runtime = await createLoadMainModule({ themeMode: 'dark' })

    expect(runtime.getStoredThemeModeMock).toHaveBeenCalled()
    expect(runtime.applyThemeModeMock).toHaveBeenCalledWith('dark')
  })

  it('registers the service worker through virtual:pwa-register', { timeout: 15_000 }, async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { addEventListener: vi.fn() }
    })
    const runtime = await createLoadMainModule()

    expect(runtime.registerSWMock).toHaveBeenCalledWith(
      expect.objectContaining({ immediate: true })
    )
    delete (navigator as any).serviceWorker
  })

  it(
    'clears the stale-asset recovery flag after a successful boot',
    { timeout: 15_000 },
    async () => {
      vi.useFakeTimers()
      const runtime = await createLoadMainModule()

      vi.advanceTimersByTime(3_000)
      expect(runtime.clearStaleAssetRecoveryFlagMock).toHaveBeenCalled()
      vi.useRealTimers()
    }
  )

  it('warns and recovers on a vite preload error', { timeout: 15_000 }, async () => {
    const runtime = await createLoadMainModule()

    const event = new Event('vite:preloadError') as Event & { payload?: unknown }
    ;(event as { payload?: unknown }).payload = new Error('chunk failed')
    let prevented = false
    Object.defineProperty(event, 'preventDefault', { value: () => (prevented = true) })
    window.dispatchEvent(event)

    expect(prevented).toBe(true)
    expect(runtime.loggerMock.warn).toHaveBeenCalled()
    expect(runtime.recoverFromStaleAssetsMock).toHaveBeenCalledWith()
  })

  it(
    'logs a loop warning and notifies the user when stale-asset recovery is skipped',
    { timeout: 15_000 },
    async () => {
      const runtime = await createLoadMainModule()
      runtime.recoverFromStaleAssetsMock.mockResolvedValue('skipped')

      const event = new Event('vite:preloadError') as Event & { payload?: unknown }
      ;(event as { payload?: unknown }).payload = new Error('chunk')
      Object.defineProperty(event, 'preventDefault', { value: () => {} })
      window.dispatchEvent(event)

      await vi.waitFor(() => {
        expect(runtime.loggerMock.error).toHaveBeenCalledWith(
          expect.stringContaining('Stale asset recovery already attempted')
        )
      })
      expect(runtime.notifyStaleAssetReloadNeededMock).toHaveBeenCalled()
    }
  )

  it('reloads the page when the service worker takes control', { timeout: 15_000 }, async () => {
    let controllerListener: (() => void) | null = null
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        addEventListener: vi.fn((_type: string, cb: () => void) => {
          controllerListener = cb
        })
      }
    })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadMock }
    })

    await createLoadMainModule()
    const getListener = () => controllerListener
    getListener()?.()

    expect(reloadMock).toHaveBeenCalled()
    delete (navigator as any).serviceWorker
  })

  it(
    'handles service worker registration, refresh and error callbacks',
    { timeout: 15_000 },
    async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { addEventListener: vi.fn() }
      })
      const updateMock = vi.fn().mockResolvedValue(undefined)
      const registration = { update: updateMock }
      const runtime = await createLoadMainModule()

      const options = runtime.swOptions as {
        onRegisteredSW: (url: string, registration: { update: () => Promise<unknown> }) => void
        onNeedRefresh: () => void
        onRegisterError: (error: unknown) => void
      }
      options.onRegisteredSW('/sw.js', registration)
      expect(updateMock).toHaveBeenCalled()

      options.onNeedRefresh()
      expect(runtime.loggerMock.info).toHaveBeenCalledWith(
        expect.stringContaining('fresh service worker')
      )

      options.onRegisterError(new Error('failed'))
      expect(runtime.loggerMock.error).toHaveBeenCalledWith(
        'Failed to register the service worker.',
        expect.any(Error)
      )

      delete (navigator as any).serviceWorker
    }
  )

  it(
    'wires a global Vue error handler that logs and notifies the user',
    { timeout: 15_000 },
    async () => {
      const runtime = await createLoadMainModule()

      const errorHandler = runtime.appMock.config.errorHandler as (err: unknown) => void
      expect(typeof errorHandler).toBe('function')

      errorHandler(new Error('render boom'))
      expect(runtime.loggerMock.error).toHaveBeenCalledWith(
        'Unhandled Vue error.',
        expect.any(Error),
        expect.any(Object)
      )
      expect(runtime.notifyUnexpectedErrorMock).toHaveBeenCalledTimes(1)
    }
  )

  it(
    'listens to window unhandledrejection events and notifies the user',
    { timeout: 15_000 },
    async () => {
      const runtime = await createLoadMainModule()

      const event = new Event('unhandledrejection')
      ;(event as { reason?: unknown }).reason = new Error('async boom')
      window.dispatchEvent(event)

      expect(runtime.loggerMock.error).toHaveBeenCalledWith(
        'Unhandled promise rejection.',
        expect.any(Error)
      )
      expect(runtime.notifyUnexpectedErrorMock).toHaveBeenCalledTimes(1)
    }
  )
})
