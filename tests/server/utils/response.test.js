import { describe, expect, it, vi } from 'vitest'

import {
  buildErrorBody,
  buildSuccessBody,
  errorPayload,
  errorResponse,
  isApiEnvelope,
  isStructuredResponse,
  sendPayload,
  successPayload,
  successResponse,
  textPayload
} from '../../../src/server/utils/response.js'

describe('response utils', () => {
  it('builds success and error envelopes with optional fields only when needed', () => {
    expect(buildSuccessBody({ id: 1 }, 'Done')).toEqual({
      success: true,
      message: 'Done',
      data: { id: 1 }
    })
    expect(buildSuccessBody()).toEqual({
      success: true,
      message: 'Success'
    })

    expect(buildErrorBody('Boom', 'BAD', { stack: 'x' })).toEqual({
      success: false,
      error: 'Boom',
      code: 'BAD',
      details: { stack: 'x' }
    })
    expect(buildErrorBody()).toEqual({
      success: false,
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    })
  })

  it('creates structured payloads and detects response shapes', () => {
    const success = successPayload({ ok: true }, 'Created', 201, { 'x-test': '1' })
    const error = errorPayload('Boom', 409, 'CONFLICT', { reason: 'duplicate' })
    const text = textPayload('hello', 202)

    expect(success).toEqual({
      statusCode: 201,
      headers: { 'x-test': '1' },
      body: {
        success: true,
        message: 'Created',
        data: { ok: true }
      }
    })
    expect(error).toEqual({
      statusCode: 409,
      body: {
        success: false,
        error: 'Boom',
        code: 'CONFLICT',
        details: { reason: 'duplicate' }
      }
    })
    expect(sendPayload('raw', { 'x-custom': 'yes' }, 202, 'send')).toEqual({
      statusCode: 202,
      headers: { 'x-custom': 'yes' },
      body: 'raw',
      responseType: 'send'
    })
    expect(text).toEqual({
      statusCode: 202,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'hello',
      responseType: 'text'
    })
    expect(isStructuredResponse(success)).toBe(true)
    expect(isStructuredResponse(text)).toBe(true)
    expect(isStructuredResponse({})).toBe(false)
    expect(isApiEnvelope(success.body)).toBe(true)
    expect(isApiEnvelope(error.body)).toBe(true)
    expect(isApiEnvelope(null)).toBe(false)
  })

  it('writes success and error responses through the express response object', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }

    successResponse(res, { id: 1 }, 'Saved')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Saved',
      data: { id: 1 }
    })

    errorResponse(res, 'Nope', 403, 'FORBIDDEN')
    expect(res.status).toHaveBeenLastCalledWith(403)
    expect(res.json).toHaveBeenLastCalledWith({
      success: false,
      error: 'Nope',
      code: 'FORBIDDEN'
    })
  })
})
