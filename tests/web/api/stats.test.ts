import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()

const loadStatsModule = async () => {
  vi.resetModules()
  vi.stubGlobal('fetch', mockFetch)
  return import('../../../src/web/api/stats.ts')
}

const createJsonResponse = (payload: unknown, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(payload),
  headers: new Headers()
})

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

  it('unwraps stats summaries from the shared api envelope', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          today_pv: 10,
          today_uv: 5,
          total_pv: 100,
          total_uv: 50,
          trend: [],
          distribution: {
            os: [],
            browser: []
          }
        }
      })
    )

    const { getStatsSummary } = await loadStatsModule()

    await expect(getStatsSummary()).resolves.toMatchObject({
      today_pv: 10,
      total_uv: 50
    })
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
