import { describe, expect, it, vi } from 'vitest'

import { ApiError, Errors, asyncHandler } from '../../../src/server/utils/ApiError.js'

describe('ApiError utils', () => {
  it('serializes ApiError instances with metadata and optional details', () => {
    const error = new ApiError('boom', 418, 'TEAPOT', { hint: 'brew' })

    expect(error).toMatchObject({
      name: 'ApiError',
      message: 'boom',
      statusCode: 418,
      code: 'TEAPOT',
      details: { hint: 'brew' }
    })
    expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(error.toJSON()).toEqual({
      success: false,
      error: {
        code: 'TEAPOT',
        message: 'boom',
        timestamp: error.timestamp,
        details: { hint: 'brew' }
      }
    })
  })

  it('builds the predefined error variants with the current wording', () => {
    expect(Errors.UNAUTHORIZED()).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' })
    expect(Errors.NOT_FOUND('用户').message).toBe('用户不存在')
    expect(Errors.DUPLICATE('用户名').statusCode).toBe(409)
    expect(Errors.VALIDATION('bad', { field: 'name' }).toJSON()).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'bad',
        timestamp: expect.any(String),
        details: { field: 'name' }
      }
    })
    expect(Errors.RATE_LIMIT().code).toBe('RATE_LIMIT_EXCEEDED')
    expect(Errors.FILE_TOO_LARGE('5MB').message).toBe('文件过大，最大支持 5MB')
    expect(Errors.UNSUPPORTED_FILE_TYPE('PNG').statusCode).toBe(415)
  })

  it('forwards async failures to next()', async () => {
    const next = vi.fn()

    await asyncHandler(async () => {
      throw Errors.OPERATION_FAILED('bad')
    })({}, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'bad' }))
  })
})
