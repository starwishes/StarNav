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

  it('logs in and merges the token payload', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: { token: 'jwt-token', user: { login: 'admin', level: 3 }, sessionId: 'session-1' }
      })
    )

    const { adminApi } = await loadAdminModule()
    const result = await adminApi.login({ username: 'admin', password: 'pw', remember: true })

    const request = mockFetch.mock.calls[0][1] as RequestInit
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/login',
      expect.objectContaining({ method: 'POST' })
    )
    expect(JSON.parse(String(request.body))).toEqual({
      username: 'admin',
      password: 'pw',
      remember: true
    })
    expect(result).toMatchObject({ token: 'jwt-token', sessionId: 'session-1' })
  })

  it('returns the session list from the sessions endpoint', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          sessions: [
            {
              sessionId: 'session-1',
              ip: '1.1.1.1',
              userAgent: 'ua',
              createdAt: '2026-04-13T12:00:00.000Z',
              lastActiveAt: '2026-04-13T12:01:00.000Z',
              isCurrent: true
            }
          ]
        }
      })
    )

    const { adminApi } = await loadAdminModule()
    const result = await adminApi.getSessions()

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ sessionId: 'session-1', isCurrent: true })
  })

  it('revokes other sessions and returns the revoked count', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ success: true, data: { revokedCount: 3 } }))

    const { adminApi } = await loadAdminModule()
    await expect(adminApi.revokeOtherSessions()).resolves.toBe(3)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions/revoke-others',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('lists admin users', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse({ success: true, data: [{ username: 'admin', level: 3 }] })
    )

    const { adminApi } = await loadAdminModule()
    const result = await adminApi.getUsers()

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/users',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result).toEqual([{ username: 'admin', level: 3 }])
  })

  it('updates admin settings', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ success: true, data: { siteName: 'Nav' } }))

    const { adminApi } = await loadAdminModule()
    const result = await adminApi.updateAdminSettings({ siteName: 'Nav' })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/settings',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result).toMatchObject({ success: true })
  })

  it('clears audit logs with an optional before filter', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ success: true }))

    const { adminApi } = await loadAdminModule()
    await adminApi.clearAuditLogs()
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/audit',
      expect.objectContaining({ method: 'DELETE' })
    )

    await adminApi.clearAuditLogs('2026-04-01')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/audit?before=2026-04-01',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('registers a new account', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ success: true }))

    const { adminApi } = await loadAdminModule()
    const result = await adminApi.register({ username: 'alice', password: 'secret' })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/register',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result).toMatchObject({ success: true })
  })

  it('adds, deletes and updates admin users', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ success: true }))

    const { adminApi } = await loadAdminModule()
    await adminApi.addUser({ username: 'alice', password: 'secret', level: 1 })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/users',
      expect.objectContaining({ method: 'POST' })
    )

    await adminApi.deleteUser('alice')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/users/alice',
      expect.objectContaining({ method: 'DELETE' })
    )

    await adminApi.updateUser('alice', { level: 2 })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/users/alice',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('revokes a single session', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ success: true }))

    const { adminApi } = await loadAdminModule()
    await adminApi.revokeSession('session-1')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions/session-1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('lists, uploads and deletes uploaded assets', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ success: true, data: { files: [] } }))

    const { adminApi } = await loadAdminModule()
    const files = await adminApi.getUploadedFiles()
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/uploads',
      expect.objectContaining({ method: 'GET' })
    )
    expect(files).toEqual([])

    mockFetch.mockResolvedValue(
      createJsonResponse({ success: true, data: { url: '/uploads/icon.png' } })
    )
    const icon = await adminApi.uploadIconAsset('base64-icon')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/upload-icon',
      expect.objectContaining({ method: 'POST' })
    )
    expect(icon.url).toBe('/uploads/icon.png')

    await adminApi.deleteUpload('icon.png')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/uploads/icon.png',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
