import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/models/stats.js', () => ({
  Stats: {
    getSummary: vi.fn(),
    recordVisit: vi.fn()
  }
}))

vi.mock('../../../src/server/services/cache/cacheService.js', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    getStats: vi.fn()
  }
}))

vi.mock('ua-parser-js', () => ({
  UAParser: vi.fn()
}))

const { statsService } = await import('../../../src/server/services/system/statsService.js')
const { Stats } = await import('../../../src/server/models/stats.js')
const cache = (await import('../../../src/server/services/cache/cacheService.js')).default
const { UAParser } = await import('ua-parser-js')

describe('StatsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return cached stats summary when available', () => {
    const cachedSummary = { total_pv: 10, total_uv: 5 }
    cache.get.mockReturnValue(cachedSummary)

    const result = statsService.getStats()

    expect(cache.get).toHaveBeenCalledWith('stats:summary')
    expect(Stats.getSummary).not.toHaveBeenCalled()
    expect(result).toEqual(cachedSummary)
  })

  it('should load and cache stats summary on cache miss', () => {
    const summary = { total_pv: 20, total_uv: 8 }
    cache.get.mockReturnValue(undefined)
    Stats.getSummary.mockReturnValue(summary)

    const result = statsService.getStats()

    expect(Stats.getSummary).toHaveBeenCalled()
    expect(cache.set).toHaveBeenCalledWith('stats:summary', summary, 30)
    expect(result).toEqual(summary)
  })

  it('should return cache runtime stats', () => {
    const runtimeStats = { keys: 4, hits: 10 }
    cache.getStats.mockReturnValue(runtimeStats)

    const result = statsService.getCacheStats()

    expect(cache.getStats).toHaveBeenCalled()
    expect(result).toEqual(runtimeStats)
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
