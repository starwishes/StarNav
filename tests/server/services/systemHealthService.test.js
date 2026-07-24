import { describe, expect, it, vi } from 'vitest'

import { systemHealthService } from '../../../src/server/services/system/systemHealthService.js'

describe('SystemHealthService', () => {
  it('should return a health payload with runtime diagnostics', async () => {
    vi.spyOn(process, 'memoryUsage').mockReturnValue({
      heapUsed: 10 * 1024 * 1024,
      heapTotal: 20 * 1024 * 1024,
      rss: 30 * 1024 * 1024
    })
    vi.spyOn(process, 'uptime').mockReturnValue(123)

    const health = await systemHealthService.getHealth()
    const payload = health.body.data

    expect([200, 503]).toContain(health.statusCode)
    expect(health.body).toMatchObject({
      success: true,
      message: 'Success'
    })
    expect(payload).toHaveProperty('checks.memory.heapUsed')
    expect(payload).toHaveProperty('checks.uptime')
    expect(payload).toHaveProperty('checks.database.ok')
    expect(payload).toHaveProperty('checks.database.size')
    expect(payload).toHaveProperty('checks.database.tables')
    expect(payload).toHaveProperty('checks.database.quickCheck')
    expect(payload).toHaveProperty('checks.database.journalMode')
    expect(payload).toHaveProperty('checks.runtime.nodeEnv')
    expect(payload).toHaveProperty('checks.runtime.authCookieSecureMode')
  })
})
