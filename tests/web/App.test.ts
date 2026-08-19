import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let dataStoreMock: any
let adminStoreMock: any
let configStoreMock: any
const mountedWrappers: Array<ReturnType<typeof mount>> = []

vi.mock('@/store/data', () => ({
  useDataStore: () => dataStoreMock
}))

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

vi.mock('@/store/config', () => ({
  useConfigStore: () => configStoreMock
}))

const App = (await import('../../src/web/App.vue')).default

const createWrapper = () => {
  const wrapper = mount(App, {
    global: {
      stubs: {
        RouterView: {
          template: '<div class="router-view-stub"></div>'
        }
      }
    }
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

describe('App bootstrap shell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dataStoreMock = reactive({
      loadData: vi.fn()
    })
    adminStoreMock = reactive({
      isAuthenticated: true,
      clearAuth: vi.fn()
    })
    configStoreMock = reactive({
      ensureLoaded: vi.fn().mockResolvedValue(undefined)
    })

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible'
    })
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    vi.restoreAllMocks()
  })

  it('fetches public config and syncs authenticated data refreshes', async () => {
    let now = 6_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    const wrapper = createWrapper()
    await flushPromises()

    expect(configStoreMock.ensureLoaded).toHaveBeenCalledTimes(1)

    document.dispatchEvent(new Event('visibilitychange'))
    expect(dataStoreMock.loadData).toHaveBeenCalledTimes(1)

    now = 8_000
    document.dispatchEvent(new Event('visibilitychange'))
    expect(dataStoreMock.loadData).toHaveBeenCalledTimes(1)

    wrapper.unmount()

    now = 20_000
    document.dispatchEvent(new Event('visibilitychange'))
    expect(dataStoreMock.loadData).toHaveBeenCalledTimes(1)
  })

  it('logs config bootstrap failures instead of leaving an unhandled rejection', async () => {
    const error = new Error('settings failed')
    configStoreMock.ensureLoaded = vi.fn().mockRejectedValue(error)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    createWrapper()
    await flushPromises()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[StarNav:web:app] Failed to initialize public settings.',
      error
    )
  })

  it('clears the in-memory admin state when the api client broadcasts auth reset', async () => {
    createWrapper()
    await flushPromises()

    window.dispatchEvent(new Event('starnav:auth-cleared'))

    expect(adminStoreMock.clearAuth).toHaveBeenCalledTimes(1)
  })
})
