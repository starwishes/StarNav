// @vitest-environment node
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

  it('defaults TRUST_PROXY to true and honors an explicit false', async () => {
    delete process.env.TRUST_PROXY
    const defaultConfig = await loadConfigModule()
    expect(defaultConfig.TRUST_PROXY).toBe(true)

    vi.resetModules()
    process.env.TRUST_PROXY = 'false'
    const explicitConfig = await loadConfigModule()
    expect(explicitConfig.TRUST_PROXY).toBe(false)
  })

  it('reads and normalizes REAL_CLIENT_IP_HEADER, validating it during env validation', async () => {
    delete process.env.REAL_CLIENT_IP_HEADER
    const defaultConfig = await loadConfigModule()
    expect(defaultConfig.REAL_CLIENT_IP_HEADER).toBe('')

    vi.resetModules()
    process.env.REAL_CLIENT_IP_HEADER = '  CF-Connecting-IP '
    const normalizedConfig = await loadConfigModule()
    expect(normalizedConfig.REAL_CLIENT_IP_HEADER).toBe('cf-connecting-ip')

    // 非法字符（空格/大写→已被 trim+lowercase，但含非法字符仍拒绝）→ validateEnv exit
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit:${code}`)
    })
    vi.resetModules()
    process.env.REAL_CLIENT_IP_HEADER = 'bad header!'
    const badConfig = await loadConfigModule()
    expect(() => badConfig.validateEnv()).toThrow('exit:1')
    exitSpy.mockRestore()

    // 合法值 → warn（提示仅经对应反代启用）
    vi.clearAllMocks()
    vi.resetModules()
    process.env.REAL_CLIENT_IP_HEADER = 'cf-connecting-ip'
    const okConfig = await loadConfigModule()
    okConfig.validateEnv()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('REAL_CLIENT_IP_HEADER=cf-connecting-ip')
    )
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

  it('rejects the leaked .env.example credentials in production', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit:${code}`)
    })

    process.env.NODE_ENV = 'production'
    process.env.PORT = '8080'
    process.env.JWT_SECRET = 'rucL6_4F8NDlKvQ0WBUPhbvos9xjIOoYQd65i-4HJcs83FsM6Ufr1RqeImf9NzAn'
    process.env.ADMIN_PASSWORD = 'UkTm7hXOUp27pbRFsY88GoS8'

    const config = await loadConfigModule()

    expect(() => config.validateEnv()).toThrow('exit:1')
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
    process.env.TRUST_PROXY = 'false'

    const config = await loadConfigModule()
    config.validateEnv()

    expect(logger.warn).toHaveBeenCalledWith('⚠️  环境变量配置建议:')
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('AUTH_COOKIE_SECURE=false'))
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('CSP_UPGRADE_INSECURE_REQUESTS=true')
    )
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('TRUST_PROXY=false'))
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('ADMIN_BOOTSTRAP_PASSWORD_DELIVERY 包含 log')
    )
  })
})
