import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/models/stats.js', () => ({
  Stats: {
    recordVisit: vi.fn()
  }
}))

vi.mock('ua-parser-js', () => ({
  UAParser: vi.fn()
}))

const { statsService } = await import('../../../src/server/services/system/statsService.js')
const { Stats } = await import('../../../src/server/models/stats.js')
const { UAParser } = await import('ua-parser-js')

describe('StatsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should normalize visit metadata and return text response', () => {
    UAParser.mockImplementation(function MockUAParser() {
      return {
        getResult: () => ({
          os: { name: 'Windows' },
          browser: { name: 'Chrome' }
        })
      }
    })

    const result = statsService.recordVisit({
      ip: '127.0.0.1',
      userAgent: 'Vitest Browser',
      referrer: 'https://example.com'
    })

    expect(UAParser).toHaveBeenCalledWith('Vitest Browser')
    expect(Stats.recordVisit).toHaveBeenCalledWith({
      ip: '127.0.0.1',
      os: 'Windows',
      browser: 'Chrome',
      referrer: 'https://example.com'
    })
    expect(result).toEqual({
      statusCode: 200,
      body: 'OK',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      },
      responseType: 'text'
    })
  })

  it('should degrade to text error response when visit recording fails', () => {
    UAParser.mockImplementation(function MockUAParser() {
      return {
        getResult: () => ({
          os: { name: 'Linux' },
          browser: { name: 'Firefox' }
        })
      }
    })
    Stats.recordVisit.mockImplementation(() => {
      throw new Error('boom')
    })

    const result = statsService.recordVisit({
      ip: '127.0.0.1',
      userAgent: 'Vitest Browser',
      referrer: ''
    })

    expect(result).toEqual({
      statusCode: 200,
      body: 'Error',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      },
      responseType: 'text'
    })
  })
})
