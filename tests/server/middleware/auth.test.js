import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'

import { authenticate, optionalAuth, requireAdmin } from '../../../src/server/middleware/auth.js'
import { accountService } from '../../../src/server/services/identity/accountService.js'
import { sessionService } from '../../../src/server/services/identity/sessionService.js'

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn()
  }
}))

vi.mock('../../../src/server/services/identity/sessionService.js', () => ({
  sessionService: {
    validate: vi.fn()
  }
}))

vi.mock('../../../src/server/services/identity/accountService.js', () => ({
  accountService: {
    findByUsername: vi.fn()
  }
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn()
  }
}))

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  json: vi.fn()
})

describe('auth middleware', () => {
  const originalCorsOrigins = process.env.CORS_ORIGINS

  beforeEach(() => {
    vi.clearAllMocks()
    accountService.findByUsername.mockReturnValue({
      username: 'alice',
      level: 1,
      authVersion: 0
    })
  })

  afterEach(() => {
    process.env.CORS_ORIGINS = originalCorsOrigins
  })

  it('should reject revoked session tokens', () => {
    jwt.verify.mockReturnValue({ username: 'alice', level: 1, sessionId: 'session-1' })
    sessionService.validate.mockReturnValue(false)

    const req = {
      path: '/api/bookmark',
      headers: {
        authorization: 'Bearer token-1'
      }
    }
    const res = createResponse()
    const next = vi.fn()

    authenticate(req, res, next)

    expect(sessionService.validate).toHaveBeenCalledWith('session-1')
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '会话已失效',
      code: 'SESSION_INVALID'
    })
  })

  it('should allow tokens without session ids when the user state is still current', () => {
    accountService.findByUsername.mockReturnValueOnce({
      username: 'ext-user',
      level: 1,
      authVersion: 2
    })
    jwt.verify.mockReturnValue({
      username: 'ext-user',
      level: 1,
      authVersion: 2,
      source: 'extension'
    })

    const req = {
      path: '/api/bookmark',
      headers: {
        authorization: 'Bearer token-2'
      }
    }
    const res = createResponse()
    const next = vi.fn()

    authenticate(req, res, next)

    expect(sessionService.validate).not.toHaveBeenCalled()
    expect(req.user).toEqual({
      username: 'ext-user',
      level: 1,
      authVersion: 2,
      source: 'extension'
    })
    expect(req.authToken).toBe('token-2')
    expect(req.authTokenSource).toBe('bearer')
    expect(next).toHaveBeenCalled()
  })

  it('should accept a valid cookie-backed session', () => {
    accountService.findByUsername.mockReturnValueOnce({
      username: 'alice',
      level: 3,
      authVersion: 4
    })
    jwt.verify.mockReturnValue({
      username: 'alice',
      level: 3,
      authVersion: 4,
      sessionId: 'session-cookie'
    })
    sessionService.validate.mockReturnValue(true)

    const req = {
      path: '/api/admin/users',
      headers: {
        cookie: 'theme=dark; starnav_auth=cookie-token'
      }
    }
    const res = createResponse()
    const next = vi.fn()

    authenticate(req, res, next)

    expect(sessionService.validate).toHaveBeenCalledWith('session-cookie')
    expect(req.authToken).toBe('cookie-token')
    expect(req.authTokenSource).toBe('cookie')
    expect(next).toHaveBeenCalled()
  })

  it('rejects cookie-backed write requests without a trusted origin', () => {
    accountService.findByUsername.mockReturnValueOnce({
      username: 'alice',
      level: 3,
      authVersion: 0
    })
    jwt.verify.mockReturnValue({
      username: 'alice',
      level: 3,
      authVersion: 0,
      sessionId: 'session-cookie'
    })
    sessionService.validate.mockReturnValue(true)

    const req = {
      method: 'POST',
      path: '/api/admin/users',
      headers: {
        cookie: 'starnav_auth=cookie-token'
      }
    }
    const res = createResponse()
    const next = vi.fn()

    authenticate(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '请求来源无效',
      code: 'INVALID_REQUEST_ORIGIN'
    })
  })

  it('allows cookie-backed write requests from trusted configured origins', () => {
    process.env.CORS_ORIGINS = 'https://panel.example.com'
    accountService.findByUsername.mockReturnValueOnce({
      username: 'alice',
      level: 3,
      authVersion: 1
    })
    jwt.verify.mockReturnValue({
      username: 'alice',
      level: 3,
      authVersion: 1,
      sessionId: 'session-cookie'
    })
    sessionService.validate.mockReturnValue(true)

    const req = {
      method: 'POST',
      path: '/api/admin/users',
      headers: {
        cookie: 'starnav_auth=cookie-token',
        origin: 'https://panel.example.com'
      }
    }
    const res = createResponse()
    const next = vi.fn()

    authenticate(req, res, next)

    expect(res.status).not.toHaveBeenCalledWith(403)
    expect(next).toHaveBeenCalled()
  })

  it('rejects cookie-backed write requests from browser extension origins', () => {
    accountService.findByUsername.mockReturnValueOnce({
      username: 'alice',
      level: 3,
      authVersion: 1
    })
    jwt.verify.mockReturnValue({
      username: 'alice',
      level: 3,
      authVersion: 1,
      sessionId: 'session-cookie'
    })
    sessionService.validate.mockReturnValue(true)

    const req = {
      method: 'POST',
      path: '/api/admin/users',
      headers: {
        cookie: 'starnav_auth=cookie-token',
        origin: 'chrome-extension://abcdefghijklmnop'
      }
    }
    const res = createResponse()
    const next = vi.fn()

    authenticate(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '请求来源无效',
      code: 'INVALID_REQUEST_ORIGIN'
    })
  })

  it('should downgrade optional auth with revoked sessions to guest mode', () => {
    jwt.verify.mockReturnValue({
      username: 'alice',
      level: 1,
      authVersion: 0,
      sessionId: 'session-3'
    })
    sessionService.validate.mockReturnValue(false)

    const req = {
      headers: {
        authorization: 'Bearer token-3'
      }
    }
    const res = createResponse()
    const next = vi.fn()

    optionalAuth(req, res, next)

    expect(sessionService.validate).toHaveBeenCalledWith('session-3')
    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  it('clears the auth cookie when a cookie token is invalid', () => {
    jwt.verify.mockImplementation(() => {
      const error = new Error('bad token')
      error.name = 'JsonWebTokenError'
      throw error
    })

    const req = {
      path: '/api/bookmark',
      headers: {
        cookie: 'starnav_auth=cookie-token'
      }
    }
    const res = createResponse()
    const next = vi.fn()

    authenticate(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.set).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('starnav_auth='))
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('rejects tokens whose user state has changed since issuance', () => {
    accountService.findByUsername.mockReturnValueOnce({
      username: 'alice',
      level: 3,
      authVersion: 5
    })
    jwt.verify.mockReturnValue({ username: 'alice', level: 3, authVersion: 4 })

    const req = {
      path: '/api/admin/users',
      headers: {
        authorization: 'Bearer stale-token'
      }
    }
    const res = createResponse()
    const next = vi.fn()

    authenticate(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '登录状态已失效，请重新登录',
      code: 'TOKEN_REVOKED'
    })
  })

  it('should return structured forbidden responses for non-admin users', () => {
    const req = {
      user: {
        username: 'alice',
        level: 1
      }
    }
    const res = createResponse()
    const next = vi.fn()

    requireAdmin(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '权限不足',
      code: 'FORBIDDEN'
    })
  })
})
