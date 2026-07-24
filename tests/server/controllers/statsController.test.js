import { beforeEach, describe, expect, it, vi } from 'vitest'

import { statsController } from '../../../src/server/controllers/statsController.js'
import { statsService } from '../../../src/server/services/system/statsService.js'

vi.mock('../../../src/server/services/system/statsService.js', () => ({
  statsService: {
    getStats: vi.fn(),
    recordVisit: vi.fn(),
    getCacheStats: vi.fn()
  }
}))

describe('StatsController Unit Tests', () => {
  let req
  let res

  beforeEach(() => {
    req = {
      body: {},
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
        'user-agent': 'Vitest Browser',
        referer: 'https://ref.example.com'
      },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn()
    }

    vi.clearAllMocks()
  })

  it('should delegate getStats to statsService', async () => {
    statsService.getStats.mockReturnValue({
      success: true,
      data: { total_pv: 10 }
    })

    await statsController.getStats(req, res)

    expect(statsService.getStats).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { total_pv: 10 }
    })
  })

  it('should delegate getCacheStats to statsService', async () => {
    statsService.getCacheStats.mockReturnValue({
      success: true,
      data: { keys: 2 }
    })

    await statsController.getCacheStats(req, res)

    expect(statsService.getCacheStats).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { keys: 2 }
    })
  })

  it('should pass normalized visit context and preserve text response', async () => {
    req.body = { url: 'https://payload.example.com' }
    statsService.recordVisit.mockReturnValue({
      statusCode: 200,
      body: 'OK',
      responseType: 'text'
    })

    await statsController.recordVisit(req, res)

    expect(statsService.recordVisit).toHaveBeenCalledWith({
      ip: '127.0.0.1',
      userAgent: 'Vitest Browser',
      referrer: 'https://payload.example.com'
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith('OK')
  })
})
