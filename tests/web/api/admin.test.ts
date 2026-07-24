import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()

const loadAdminModule = async () => {
  vi.resetModules()
  vi.stubGlobal('fetch', mockFetch)
  return import('../../../src/web/api/admin.ts')
}

const createJsonResponse = (payload: unknown, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(payload),
  headers: new Headers()
})

describe('admin api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockFetch.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('parses audit log details and returns pagination metadata', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          logs: [
            {
              id: 1,
              action: 'LOGIN',
              username: 'admin',
              ip: '127.0.0.1',
              userAgent: 'raw-agent',
              timestamp: '2026-04-13T12:00:00.000Z',
              details: JSON.stringify({
                success: false,
                userAgent: 'parsed-agent'
              })
            },
            {
              id: 2,
              action: 'UPDATE',
              username: 'admin',
              ip: '127.0.0.1',
              userAgent: 'kept-agent',
              timestamp: '2026-04-13T12:01:00.000Z',
              details: 'not-json'
            }
          ],
          total: 7
        }
      })
    )

    const { adminApi } = await loadAdminModule()
    const result = await adminApi.getAuditLogs(2, 20)

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/audit?page=2&limit=20',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result).toEqual({
      logs: [
        expect.objectContaining({
          id: 1,
          success: false,
          userAgent: 'parsed-agent'
        }),
        expect.objectContaining({
          id: 2,
          userAgent: 'kept-agent',
          details: 'not-json'
        })
      ],
      total: 7
    })
  })

  it('unwraps degraded health payloads from 503 responses instead of rethrowing', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse(
        {
          message: 'Service degraded',
          data: {
            status: 'degraded',
            version: '2.5.0',
            timestamp: '2026-04-13T12:00:00.000Z',
            checks: {
              uptime: 1,
              memory: {
                rss: '1 MB',
                heapUsed: '1 MB',
                heapTotal: '2 MB'
              },
              database: {
                ok: false,
                size: 1,
                tables: 2,
                quickCheck: 'failed',
                journalMode: 'wal'
              },
              cache: {
                hits: 3,
                misses: 4,
                keys: 5
              },
              runtime: {
                nodeEnv: 'production',
                authCookieSecureMode: 'auto',
                cspUpgradeInsecureRequests: false,
                corsOriginsConfigured: true,
                dataDir: '/tmp/data',
                uploadsDir: '/tmp/data/uploads'
              }
            }
          }
        },
        {
          ok: false,
          status: 503
        }
      )
    )

    const { adminApi } = await loadAdminModule()

    await expect(adminApi.getSystemHealth()).resolves.toMatchObject({
      status: 'degraded',
      version: '2.5.0'
    })
  })

  it('extracts uploaded asset urls from nested envelopes', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          url: '/uploads/background.png'
        }
      })
    )

    const { adminApi } = await loadAdminModule()
    const result = await adminApi.uploadBackgroundAsset('base64-data', 'background.png')

    const request = mockFetch.mock.calls[0][1] as RequestInit

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/upload-background',
      expect.objectContaining({ method: 'POST' })
    )
    expect(JSON.parse(String(request.body))).toEqual({
      data: 'base64-data',
      filename: 'background.png'
    })
    expect(result).toEqual({
      success: true,
      data: {
        url: '/uploads/background.png'
      },
      url: '/uploads/background.png'
    })
  })
})
