// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authController } from '../../../src/server/controllers/authController.js'
import { authLifecycleService } from '../../../src/server/services/identity/authLifecycleService.js'

vi.mock('../../../src/server/services/identity/authLifecycleService.js', () => ({
  authLifecycleService: {
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn()
  }
}))

describe('AuthController Unit Tests', () => {
  let req
  let res

  beforeEach(() => {
    req = {
      body: { username: 'alice', password: 'Secret123!' },
      user: { username: 'alice', sessionId: 'session-1' },
      protocol: 'http',
      headers: { 'user-agent': 'Vitest' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    }
    res = {
      status: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      json: vi.fn(),
      redirect: vi.fn()
    }

    vi.clearAllMocks()
  })

  it('should pass request context when logging in', async () => {
    authLifecycleService.login.mockReturnValue({
      token: 'token-1',
      user: { login: 'alice', name: 'alice', level: 1 },
      sessionId: 'session-1',
      expiresInDays: 30
    })

    await authController.login(req, res)

    expect(authLifecycleService.login).toHaveBeenCalledWith(req.body, {
      ip: '127.0.0.1',
      userAgent: 'Vitest'
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.set).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('starnav_auth=token-1')
    )
    expect(res.set.mock.calls[0][1]).not.toContain('Secure')
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: {
        token: 'token-1',
        user: { login: 'alice', name: 'alice', level: 1 },
        sessionId: 'session-1',
        expiresInDays: 30
      }
    })
  })

  it('strips the JWT from the login response for browser web origins', async () => {
    req.headers.origin = 'http://localhost:8080'
    authLifecycleService.login.mockReturnValue({
      token: 'token-web',
      user: { login: 'alice', name: 'alice', level: 1 },
      sessionId: 'session-1',
      expiresInDays: 90
    })

    await authController.login(req, res)

    const body = res.json.mock.calls[0][0]
    expect(body.data).not.toHaveProperty('token')
    expect(body.data).toEqual({
      user: { login: 'alice', name: 'alice', level: 1 },
      sessionId: 'session-1',
      expiresInDays: 90
    })
    // 会话仍通过 HttpOnly Cookie 下发
    expect(res.set).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('starnav_auth=token-web')
    )
  })

  it('keeps the token in the login response for browser extension origins', async () => {
    req.headers.origin = 'chrome-extension://abcdefghijklmnop'
    authLifecycleService.login.mockReturnValue({
      token: 'token-ext',
      user: { login: 'alice', name: 'alice', level: 1 },
      sessionId: 'session-1',
      expiresInDays: 30
    })

    await authController.login(req, res)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: {
        token: 'token-ext',
        user: { login: 'alice', name: 'alice', level: 1 },
        sessionId: 'session-1',
        expiresInDays: 30
      }
    })
  })

  it('keeps the token in the login response for moz-extension origins', async () => {
    req.headers.origin = 'moz-extension://fedcba0987654321'
    authLifecycleService.login.mockReturnValue({
      token: 'token-moz',
      user: { login: 'alice', name: 'alice', level: 1 },
      sessionId: 'session-1',
      expiresInDays: 30
    })

    await authController.login(req, res)

    expect(res.json.mock.calls[0][0].data.token).toBe('token-moz')
  })

  it('should mark auth cookies as Secure for https requests', async () => {
    req.protocol = 'https'
    authLifecycleService.login.mockReturnValue({
      token: 'secure-token',
      user: { login: 'alice', name: 'alice', level: 1 },
      sessionId: 'session-1'
    })

    await authController.login(req, res)

    expect(res.set).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('starnav_auth=secure-token')
    )
    expect(res.set.mock.calls[0][1]).toContain('Secure')
  })

  it('extends the session cookie to 90 days when remember is requested', async () => {
    req.body = { username: 'alice', password: 'Secret123!', remember: true }
    authLifecycleService.login.mockReturnValue({
      token: 'remember-token',
      user: { login: 'alice', name: 'alice', level: 1 },
      sessionId: 'session-1'
    })

    await authController.login(req, res)

    // 90 days = 7776000 seconds in Max-Age
    expect(res.set.mock.calls[0][1]).toContain('Max-Age=7776000')
  })

  it('honours an explicit expiresInDays returned by the login service', async () => {
    authLifecycleService.login.mockReturnValue({
      token: 'token-custom',
      user: { login: 'alice', name: 'alice', level: 1 },
      sessionId: 'session-1',
      expiresInDays: 14
    })

    await authController.login(req, res)

    expect(res.set.mock.calls[0][1]).toContain('Max-Age=1209600')
  })

  it('rejects login requests from untrusted cross-site origins', async () => {
    req.headers.origin = 'https://evil.example.com'
    authLifecycleService.login.mockReturnValue({
      token: 'should-not-happen',
      user: { login: 'alice', name: 'alice', level: 1 },
      sessionId: 'session-1'
    })

    await authController.login(req, res)

    expect(authLifecycleService.login).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('clears the auth cookie on logout', async () => {
    authLifecycleService.logout.mockResolvedValue({})

    await authController.logout(req, res)

    expect(authLifecycleService.logout).toHaveBeenCalledWith(req.user, {
      ip: '127.0.0.1',
      userAgent: 'Vitest'
    })
    expect(res.set).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('starnav_auth='))
    expect(res.set.mock.calls[0][1]).toMatch(/Max-Age=0|Expires=/)
  })

  it('delegates register to the auth lifecycle service', async () => {
    authLifecycleService.register.mockReturnValue({ success: true, user: { login: 'bob' } })

    await authController.register(req, res)

    expect(authLifecycleService.register).toHaveBeenCalledWith(req.body, {
      ip: '127.0.0.1',
      userAgent: 'Vitest'
    })
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
