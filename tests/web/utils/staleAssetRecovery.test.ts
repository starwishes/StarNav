import { describe, expect, it, vi } from 'vitest'
import {
  STALE_ASSET_RECOVERY_KEY,
  clearStaleAssetRecoveryFlag,
  recoverFromStaleAssets
} from '@/utils/staleAssetRecovery'

describe('staleAssetRecovery', () => {
  it('unregisters service workers, clears caches, and reloads once', async () => {
    const unregister = vi.fn().mockResolvedValue(true)
    const reload = vi.fn()
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    const cachesApi = {
      keys: vi.fn().mockResolvedValue(['a', 'b']),
      delete: vi.fn().mockResolvedValue(true)
    }

    const result = await recoverFromStaleAssets({
      reload,
      storage,
      cachesApi,
      getRegistrations: async () => [{ unregister } as unknown as ServiceWorkerRegistration]
    })

    expect(result).toBe('recovered')
    expect(storage.setItem).toHaveBeenCalledWith(STALE_ASSET_RECOVERY_KEY, '1')
    expect(unregister).toHaveBeenCalledTimes(1)
    expect(cachesApi.delete).toHaveBeenCalledWith('a')
    expect(cachesApi.delete).toHaveBeenCalledWith('b')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('skips a second recovery in the same session to avoid reload loops', async () => {
    const reload = vi.fn()
    const storage = {
      getItem: vi.fn().mockReturnValue('1'),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }

    const result = await recoverFromStaleAssets({ reload, storage })

    expect(result).toBe('skipped')
    expect(reload).not.toHaveBeenCalled()
  })

  it('clears the recovery flag after a healthy boot', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    clearStaleAssetRecoveryFlag(storage)
    expect(storage.removeItem).toHaveBeenCalledWith(STALE_ASSET_RECOVERY_KEY)
  })
})
