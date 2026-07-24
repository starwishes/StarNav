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
      sessionId: 'session-1'
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
        sessionId: 'session-1'
      }
    })
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
})
