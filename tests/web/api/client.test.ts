import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()

const loadClientModule = async () => {
  vi.resetModules()
  vi.stubGlobal('fetch', mockFetch)
  return import('../../../src/web/api/client.ts')
}

const createJsonResponse = (payload: unknown, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(payload),
  headers: new Headers()
})

describe('frontend api client', () => {
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

  it('sends same-origin credentials and json headers to requests', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ success: true, data: { enabled: true } }))

    const { api } = await loadClientModule()
    await expect(api.get('/settings')).resolves.toEqual({ success: true, data: { enabled: true } })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/settings',
      expect.objectContaining({ method: 'GET' })
    )

    const request = mockFetch.mock.calls[0][1] as RequestInit
    const headers = request.headers as Headers

    expect(request.credentials).toBe('same-origin')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('clears stored auth on 401 responses and throws an ApiClientError', async () => {
    localStorage.setItem('admin_user', '{"login":"admin"}')
    const authClearedListener = vi.fn()
    window.addEventListener('starnav:auth-cleared', authClearedListener)
    mockFetch.mockResolvedValue(
      createJsonResponse(
        {
          error: 'Token expired'
        },
        {
          ok: false,
          status: 401
        }
      )
    )

    const { api } = await loadClientModule()

    await expect(api.get('/protected')).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'Token expired',
      status: 401
    })

    expect(localStorage.getItem('admin_user')).toBeNull()
    expect(authClearedListener).toHaveBeenCalledTimes(1)
  })

  it('keeps the local auth state when a login attempt returns 401 (wrong password)', async () => {
    // 已登录用户换号输错密码：POST /login 401 = 业务上的"密码错误"，HttpOnly 会话仍有效，
    // 不应清空本地登录态或广播 AUTH_CLEARED_EVENT
    localStorage.setItem('admin_user', '{"login":"admin"}')
    const authClearedListener = vi.fn()
    window.addEventListener('starnav:auth-cleared', authClearedListener)
    mockFetch.mockResolvedValue(
      createJsonResponse(
        {
          error: '用户名或密码错误'
        },
        {
          ok: false,
          status: 401
        }
      )
    )

    const { api } = await loadClientModule()

    await expect(
      api.post('/login', { username: 'other', password: 'wrong' })
    ).rejects.toMatchObject({
      name: 'ApiClientError',
      message: '用户名或密码错误',
      status: 401
    })

    expect(localStorage.getItem('admin_user')).toBe('{"login":"admin"}')
    expect(authClearedListener).not.toHaveBeenCalled()
  })

  it('does not clear auth or broadcast on 401 when no local login state exists', async () => {
    const authClearedListener = vi.fn()
    window.addEventListener('starnav:auth-cleared', authClearedListener)
    mockFetch.mockResolvedValue(
      createJsonResponse(
        { error: 'expired' },
        {
          ok: false,
          status: 401
        }
      )
    )

    const { api } = await loadClientModule()

    await expect(api.get('/protected')).rejects.toMatchObject({ status: 401 })
    expect(localStorage.getItem('admin_user')).toBeNull()
    expect(authClearedListener).not.toHaveBeenCalled()
  })

  it('returns blob payloads with decoded filenames and content types', async () => {
    const archiveBlob = new Blob(['zip-data'], { type: 'application/zip' })

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      blob: vi.fn().mockResolvedValue(archiveBlob),
      headers: new Headers({
        'content-disposition': "attachment; filename*=UTF-8''star%20nav.zip",
        'content-type': 'application/zip'
      })
    })

    const { api } = await loadClientModule()
    const result = await api.blob('/exports/bookmarks.zip')

    expect(result).toEqual({
      blob: archiveBlob,
      filename: 'star nav.zip',
      contentType: 'application/zip'
    })
  })
})
