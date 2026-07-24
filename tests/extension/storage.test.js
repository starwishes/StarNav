import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('browser extension storage helpers', () => {
  beforeEach(() => {
    global.chrome = {
      storage: {
        sync: {
          get: vi.fn((keys, callback) => callback({ lang: 'zh' })),
          set: vi.fn((data, callback) => callback?.())
        },
        local: {
          get: vi.fn((keys, callback) => callback({ token: 'signed-token' })),
          set: vi.fn((data, callback) => callback?.())
        }
      }
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete global.chrome
  })

  it('reads values from the requested storage area', async () => {
    const { getStorage } = await import('../../clients/extension/popup/modules/storage.js')

    await expect(getStorage(['lang'])).resolves.toEqual({ lang: 'zh' })
    await expect(getStorage(['token'], 'local')).resolves.toEqual({ token: 'signed-token' })
  })

  it('writes values to the requested storage area', async () => {
    const { setStorage } = await import('../../clients/extension/popup/modules/storage.js')

    await expect(setStorage({ lang: 'en' })).resolves.toBeUndefined()
    await expect(setStorage({ token: 'next-token' }, 'local')).resolves.toBeUndefined()

    expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
      { lang: 'en' },
      expect.any(Function)
    )
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith(
      { token: 'next-token' },
      expect.any(Function)
    )
  })
})
