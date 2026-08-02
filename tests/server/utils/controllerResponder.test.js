import { describe, expect, it, vi } from 'vitest'

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger
}))

const { respondWithService } = await import('../../../src/server/utils/controllerResponder.js')

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
  send: vi.fn(),
  set: vi.fn()
})

describe('controllerResponder', () => {
  it('should log 4xx service failures at debug level instead of error', async () => {
    const res = createResponse()

    await respondWithService(res, () => {
      const error = new Error('参数错误')
      error.statusCode = 400
      error.code = 'BAD_REQUEST'
      throw error
    })

    expect(logger.debug).toHaveBeenCalledWith('Controller request rejected', {
      error: '参数错误',
      statusCode: 400,
      code: 'BAD_REQUEST'
    })
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('should keep logging 5xx service failures at error level', async () => {
    const res = createResponse()

    await respondWithService(res, () => {
      const error = new Error('爆炸了')
      error.statusCode = 500
      error.code = 'INTERNAL_ERROR'
      throw error
    })

    expect(logger.error).toHaveBeenCalledWith('Controller service execution failed', {
      error: '爆炸了',
      statusCode: 500,
      code: 'INTERNAL_ERROR'
    })
  })

  it('should normalize plain values into success envelopes', async () => {
    const res = createResponse()

    await respondWithService(res, () => ({ item: { id: 1 } }))

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: {
        item: {
          id: 1
        }
      }
    })
  })

  it('should forward structured text responses with headers through send()', async () => {
    const res = createResponse()

    await respondWithService(res, () => ({
      statusCode: 202,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-test': '1'
      },
      body: 'OK',
      responseType: 'text'
    }))

    expect(res.status).toHaveBeenCalledWith(202)
    expect(res.set).toHaveBeenCalledWith('content-type', 'text/plain; charset=utf-8')
    expect(res.set).toHaveBeenCalledWith('x-test', '1')
    expect(res.send).toHaveBeenCalledWith('OK')
    expect(res.json).not.toHaveBeenCalled()
  })
})
