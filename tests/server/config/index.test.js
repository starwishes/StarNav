import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger
}))

const loadConfigModule = () => import('../../../src/server/config/index.js')

describe('config/index', () => {
  const originalEnv = process.env
  let testDataDir

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.JWT_SECRET
    testDataDir = createTestDataDir('starnav-config-test')
  })

  afterEach(async () => {
    await cleanupTestDataDir(testDataDir, { closeDatabase: false })
    process.env = originalEnv
  })

  it('should use an in-memory test JWT secret without creating a secret file', async () => {
    const config = await loadConfigModule()

    expect(config.JWT_SECRET).toBe('test-jwt-secret-for-vitest-only-0123456789abcdef')
    expect(fs.existsSync(path.join(testDataDir, '.jwt_secret'))).toBe(false)
  })

  it('rejects unsupported bootstrap password, cookie, CSP, and proxy override values during env validation', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit:${code}`)
    })

    process.env.PORT = '8080'
    process.env.ADMIN_BOOTSTRAP_PASSWORD_DELIVERY = 'sometimes'
    process.env.AUTH_COOKIE_SECURE = 'sometimes'
    process.env.CSP_UPGRADE_INSECURE_REQUESTS = 'maybe'
    process.env.TRUST_PROXY = 'sometimes'

    const config = await loadConfigModule()

    expect(() => config.validateEnv()).toThrow('exit:1')
    expect(logger.error).toHaveBeenCalledWith('❌ 环境变量校验失败:')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('warns when production uses insecure cookie overrides or forced CSP upgrades', async () => {
    process.env.NODE_ENV = 'production'
    process.env.PORT = '8080'
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef'
    process.env.CORS_ORIGINS = 'https://nav.example.com'
    process.env.ADMIN_BOOTSTRAP_PASSWORD_DELIVERY = 'both'
    process.env.AUTH_COOKIE_SECURE = 'false'
    process.env.CSP_UPGRADE_INSECURE_REQUESTS = 'true'
    process.env.TRUST_PROXY = 'true'

    const config = await loadConfigModule()
    config.validateEnv()

    expect(logger.warn).toHaveBeenCalledWith('⚠️  环境变量配置建议:')
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('AUTH_COOKIE_SECURE=false'))
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('CSP_UPGRADE_INSECURE_REQUESTS=true')
    )
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('TRUST_PROXY=true'))
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('ADMIN_BOOTSTRAP_PASSWORD_DELIVERY 包含 log')
    )
  })
})
