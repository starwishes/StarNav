import { beforeEach, describe, expect, it, vi } from 'vitest'

const recordVisit = vi.fn()
const getResult = vi.fn()
const UAParser = vi.fn(function UAParser() {
  this.getResult = getResult
})

vi.mock('../../../src/server/models/stats.js', () => ({
  Stats: {
    recordVisit
  }
}))

vi.mock('ua-parser-js', () => ({
  UAParser
}))

const { statsLogger } = await import('../../../src/server/middleware/statsLogger.js')

describe('statsLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getResult.mockReturnValue({
      os: { name: 'macOS' },
      browser: { name: 'Safari' }
    })
  })

  it('skips non-page requests and still calls next', () => {
    const next = vi.fn()

    statsLogger({ method: 'POST', url: '/', headers: {}, socket: {} }, {}, next)
    statsLogger({ method: 'GET', url: '/assets/app.js', headers: {}, socket: {} }, {}, next)
    statsLogger({ method: 'GET', url: '/api/health', headers: {}, socket: {} }, {}, next)

    expect(recordVisit).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(3)
  })

  it('records visits for page requests with normalized request metadata', () => {
    const next = vi.fn()

    statsLogger(
      {
        method: 'GET',
        url: '/dashboard?tab=main',
        headers: {
          'x-forwarded-for': '10.0.0.1, 10.0.0.2',
          'user-agent': 'Vitest Browser',
          referer: 'https://referrer.test'
        },
        ip: '203.0.113.10',
        connection: {
          remoteAddress: '127.0.0.1'
        },
        socket: {
          remoteAddress: '127.0.0.1'
        }
      },
      {},
      next
    )

    expect(UAParser).toHaveBeenCalledWith('Vitest Browser')
    expect(recordVisit).toHaveBeenCalledWith({
      ip: '203.0.113.10',
      os: 'macOS',
      browser: 'Safari',
      referrer: 'https://referrer.test'
    })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('swallows stats collection failures without breaking the request', () => {
    const next = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    recordVisit.mockImplementation(() => {
      throw new Error('boom')
    })

    statsLogger(
      {
        method: 'GET',
        url: '/',
        headers: {
          'user-agent': 'Vitest Browser'
        },
        socket: {
          remoteAddress: '127.0.0.1'
        }
      },
      {},
      next
    )

    expect(errorSpy).toHaveBeenCalledWith('Stats logging error:', expect.any(Error))
    expect(next).toHaveBeenCalledTimes(1)
  })
})
