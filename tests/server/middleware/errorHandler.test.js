import { beforeEach, describe, expect, it, vi } from 'vitest'

const logger = {
  error: vi.fn()
}

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger
}))

const { ApiError, asyncHandler, errorHandler, errors, formatError } =
  await import('../../../src/server/middleware/errorHandler.js')

describe('errorHandler middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.NODE_ENV
  })

  it('formats errors with production and development detail rules', () => {
    const error = new Error('boom')
    error.code = 'BROKEN'
    error.stack = 'stack-trace'

    expect(formatError(error, false)).toEqual({
      success: false,
      error: 'boom',
      code: 'BROKEN'
    })
    expect(formatError(error, true)).toEqual({
      success: false,
      error: 'boom',
      code: 'BROKEN',
      details: 'stack-trace'
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

  it('includes stack traces in development and keeps async handler forwarding', async () => {
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

    const next = vi.fn()
    await asyncHandler(async () => {
      throw errors.badRequest('bad')
    })({}, {}, next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'bad', statusCode: 400 }))
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
