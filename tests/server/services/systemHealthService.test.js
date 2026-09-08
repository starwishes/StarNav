// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { systemHealthService } from '../../../src/server/services/system/systemHealthService.js'

describe('SystemHealthService', () => {
  it('should return a minimal payload for anonymous probes (no runtime diagnostics)', async () => {
    vi.spyOn(process, 'memoryUsage').mockReturnValue({
      heapUsed: 10 * 1024 * 1024,
      heapTotal: 20 * 1024 * 1024,
      rss: 30 * 1024 * 1024
    })
    vi.spyOn(process, 'uptime').mockReturnValue(123)

    const health = await systemHealthService.getHealth()
    const payload = health.body.data

    expect([200, 503]).toContain(health.statusCode)
    expect(payload.status).toBe('healthy')
    expect(payload.timestamp).toBeTruthy()
    // 匿名不泄露精确版本号（部署指纹，第 27 轮盲审 L1）
    expect(payload).not.toHaveProperty('version')
    // 匿名最小负载只含 database.ok，锁定形（第 26 轮收口：曾把 size/counts/writable 等整份下发）
    expect(payload.checks).toEqual({ database: { ok: true } })
    expect(payload.checks.database).not.toHaveProperty('userCount')
    expect(payload.checks.database).not.toHaveProperty('itemCount')
    expect(payload.checks.database).not.toHaveProperty('categoryCount')
    expect(payload.checks.database).not.toHaveProperty('size')
    expect(payload.checks.database).not.toHaveProperty('writable')
    // 匿名不泄露运行时指纹（第 25 轮盲审 L1）
    expect(payload.checks).not.toHaveProperty('runtime')
    expect(payload.checks).not.toHaveProperty('memory')
    expect(payload.checks).not.toHaveProperty('queries')
    expect(payload.checks).not.toHaveProperty('uptime')
    expect(payload.checks).not.toHaveProperty('cache')
  })

  it('should return a health payload with runtime diagnostics for admins', async () => {
    vi.spyOn(process, 'memoryUsage').mockReturnValue({
      heapUsed: 10 * 1024 * 1024,
      heapTotal: 20 * 1024 * 1024,
      rss: 30 * 1024 * 1024
    })
    vi.spyOn(process, 'uptime').mockReturnValue(123)

    const health = await systemHealthService.getHealth({ detailed: true })
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
    expect(payload).toHaveProperty('checks.queries')
  })
})
