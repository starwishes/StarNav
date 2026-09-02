// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const logger = {
  error: vi.fn()
}

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger
}))

const { errorHandler } = await import('../../../src/server/middleware/errorHandler.js')
const { formatError } = await import('../../../src/server/utils/response.js')
const { ApiError, errors } = await import('../../../src/server/utils/errors.js')

describe('errorHandler middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.NODE_ENV
  })

  it('formats errors with production and development detail rules', () => {
    const error = new Error('boom')
    error.code = 'BROKEN'
    error.stack = 'stack-trace'

    // 5xx in production: generic message and code, no internal details leaked
    expect(formatError(error, false, 500)).toEqual({
      success: false,
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    })
    // 5xx in development: full message + stack for debugging
    expect(formatError(error, true, 500)).toEqual({
      success: false,
      error: 'boom',
      code: 'BROKEN',
      details: 'stack-trace'
    })
  })

  it('keeps original messages for 4xx client errors regardless of environment', () => {
    const error = new Error('nope')
    error.code = 'NOT_FOUND'
    error.stack = 'stack-trace'

    expect(formatError(error, false, 404)).toEqual({
      success: false,
      error: 'nope',
      code: 'NOT_FOUND'
    })
    expect(formatError(error, true, 400)).toEqual({
      success: false,
      error: 'nope',
      code: 'NOT_FOUND',
      details: 'stack-trace'
    })
  })

  it('falls back to a Chinese generic message when a client error has no message', () => {
    const error = new Error('')
    error.code = 'BAD_REQUEST'

    expect(formatError(error, false, 400)).toEqual({
      success: false,
      error: '请求错误',
      code: 'BAD_REQUEST'
    })
  })

  it('logs request context and sends formatted api errors', () => {
    const req = {
      path: '/api/test',
      method: 'POST'
    }
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    const error = errors.forbidden('nope')

    errorHandler(error, req, res, vi.fn())

    expect(logger.error).toHaveBeenCalledWith('API Error:', {
      path: '/api/test',
      method: 'POST',
      error: 'nope',
      stack: expect.any(String)
    })
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'nope',
      code: 'FORBIDDEN'
    })
  })

  it('includes stack traces in development and hides internals in production', async () => {
    process.env.NODE_ENV = 'development'
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    const error = new Error('dev-fail')
    error.stack = 'dev-stack'

    errorHandler(error, { path: '/boom', method: 'GET' }, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'dev-fail',
      code: 'INTERNAL_ERROR',
      details: 'dev-stack'
    })

    // Production (NODE_ENV unset): unexpected 500 must not leak internal messages
    process.env.NODE_ENV = ''
    const prodRes = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    errorHandler(
      new Error('SQLITE_CANTOPEN: /data/starnav.db'),
      { path: '/boom', method: 'GET' },
      prodRes,
      vi.fn()
    )
    expect(prodRes.json).toHaveBeenCalledWith({
      success: false,
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    })
  })

  it('forwards to next without writing a response when headers are already sent', () => {
    const res = {
      headersSent: true,
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    const next = vi.fn()
    const error = new Error('boom')

    errorHandler(error, { path: '/boom', method: 'GET' }, res, next)

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('creates ApiError instances through helpers with the current status/code mapping', () => {
    expect(new ApiError('x')).toMatchObject({
      message: 'x',
      code: 'API_ERROR',
      statusCode: 500,
      name: 'ApiError'
    })
    expect(errors.notFound().statusCode).toBe(404)
    expect(errors.unauthorized().code).toBe('UNAUTHORIZED')
    expect(errors.conflict().statusCode).toBe(409)
    expect(errors.internal().code).toBe('INTERNAL_ERROR')
  })
})
