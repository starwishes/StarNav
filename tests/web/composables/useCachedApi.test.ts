import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCachedApi } from '@/composables/useCachedApi'

describe('useCachedApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('fetches once, caches the result in memory, and refreshes when forced', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ value: 'first' })
      .mockResolvedValueOnce({ value: 'second' })

    const api = useCachedApi(fetchFn, 'stats', 60_000)

    await expect(api.fetch()).resolves.toEqual({ value: 'first' })
    await expect(api.fetch()).resolves.toEqual({ value: 'first' })
    await expect(api.fetch(true)).resolves.toEqual({ value: 'second' })

    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(api.data.value).toEqual({ value: 'second' })
    expect(api.loading.value).toBe(false)
    expect(JSON.parse(localStorage.getItem('cache_stats') || '{}')).toMatchObject({
      data: { value: 'second' }
    })
  })

  it('restores valid localStorage cache, skips expired cache, and can clear cache', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(2_000)
    localStorage.setItem(
      'cache_profile',
      JSON.stringify({
        data: { username: 'alice' },
        timestamp: 1_500
      })
    )

    const api = useCachedApi(vi.fn(), 'profile', 1_000)
    expect(api.restoreFromStorage()).toBe(true)
    expect(api.data.value).toEqual({ username: 'alice' })

    localStorage.setItem(
      'cache_profile',
      JSON.stringify({
        data: { username: 'expired' },
        timestamp: 500
      })
    )
    expect(api.restoreFromStorage()).toBe(false)

    api.clearCache()
    expect(api.data.value).toBeNull()
    expect(localStorage.getItem('cache_profile')).toBeNull()
    nowSpy.mockRestore()
  })

  it('surfaces fetch errors and malformed storage gracefully', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchFn = vi.fn().mockRejectedValue(new Error('boom'))
    const api = useCachedApi(fetchFn, 'broken')

    await expect(api.fetch()).rejects.toThrow('boom')
    expect(api.error.value?.message).toBe('boom')

    localStorage.setItem('cache_broken', '{bad json')
    expect(api.restoreFromStorage()).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
  })
})
