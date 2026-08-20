import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()

const loadStatsModule = async () => {
  vi.resetModules()
  vi.stubGlobal('fetch', mockFetch)
  return import('../../../src/web/api/stats.ts')
}

const createTextResponse = (payload: string, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  text: vi.fn().mockResolvedValue(payload),
  headers: new Headers()
})

describe('stats api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('posts visit records through the shared client helper', async () => {
    mockFetch.mockResolvedValue(createTextResponse('OK'))

    const { recordVisit } = await loadStatsModule()
    await expect(recordVisit('/admin/dashboard')).resolves.toBe('OK')

    const request = mockFetch.mock.calls[0][1] as RequestInit

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/visit',
      expect.objectContaining({ method: 'POST' })
    )
    expect(JSON.parse(String(request.body))).toEqual({
      url: '/admin/dashboard'
    })
  })
})
