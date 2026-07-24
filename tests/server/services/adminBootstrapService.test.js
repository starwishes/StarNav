import { beforeEach, describe, expect, it, vi } from 'vitest'

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}

const mkdirSync = vi.fn()
const writeFileSync = vi.fn()
const existsSync = vi.fn(() => false)
const readFileSync = vi.fn(() => '')
const rmSync = vi.fn()

const getMock = vi.fn()
const runMock = vi.fn()
const prepareMock = vi.fn((sql) => {
  if (sql.includes('SELECT * FROM users')) {
    return { get: getMock }
  }
  return { run: runMock }
})

const db = {
  prepare: prepareMock
}

const hashSync = vi.fn(() => 'hashed-password')
const compareSync = vi.fn(() => false)

vi.mock('../../../src/server/services/database/database.js', () => ({
  getDb: () => db
}))

vi.mock('../../../src/server/config/index.js', () => ({
  ADMIN_BOOTSTRAP_PASSWORD_PATH: '/secure/.admin_bootstrap_password',
  DATA_DIR: '/secure',
  DEFAULT_ADMIN_NAME: 'admin'
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger
}))

vi.mock('fs', () => ({
  default: {
    mkdirSync,
    writeFileSync,
    existsSync,
    readFileSync,
    rmSync
  }
}))

vi.mock('bcryptjs', () => ({
  default: {
    hashSync,
    compareSync
  }
}))

const { adminBootstrapService, consumeBootstrapPasswordFile } =
  await import('../../../src/server/services/identity/adminBootstrapService.js')

describe('AdminBootstrapService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, NODE_ENV: 'test' }
  })

  it('should create the admin account when it does not exist', () => {
    getMock.mockReturnValue(undefined)

    adminBootstrapService.initAdminAccount()

    expect(hashSync).toHaveBeenCalledWith('admin123', 10)
    expect(runMock).toHaveBeenCalledWith('admin', 'hashed-password')
    expect(logger.info).toHaveBeenCalledWith('管理员账户[admin]初始化成功')
  })

  it('should repair downgraded admin level when account already exists', () => {
    getMock.mockReturnValue({
      username: 'admin',
      password: 'stored-hash',
      level: 1
    })

    adminBootstrapService.initAdminAccount()

    expect(runMock).toHaveBeenCalledWith('admin')
    expect(logger.warn).toHaveBeenCalledWith('管理员账户[admin]权限等级已自动修复(0 -> 3)')
    expect(logger.info).toHaveBeenCalledWith('管理员账户[admin]验证状态：OK')
  })

  it('should persist generated production passwords to a secure file by default instead of logging them', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    getMock.mockReturnValue(undefined)
    process.env = { ...originalEnv, NODE_ENV: 'production' }

    adminBootstrapService.initAdminAccount()

    expect(mkdirSync).toHaveBeenCalledWith('/secure', { recursive: true })
    expect(writeFileSync).toHaveBeenCalledWith(
      '/secure/.admin_bootstrap_password',
      expect.stringContaining('password='),
      { mode: 0o600 }
    )
    expect(logger.warn).toHaveBeenCalledWith('出于安全考虑，系统已生成随机密码并写入受限文件')
    expect(logger.warn).toHaveBeenCalledWith('密码文件: /secure/.admin_bootstrap_password')
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('初始密码: '))

    randomSpy.mockRestore()
  })

  it('should log generated production passwords when delivery mode is set to log', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    getMock.mockReturnValue(undefined)
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      ADMIN_BOOTSTRAP_PASSWORD_DELIVERY: 'log'
    }

    adminBootstrapService.initAdminAccount()

    expect(writeFileSync).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      '已按 ADMIN_BOOTSTRAP_PASSWORD_DELIVERY 配置将初始密码输出到启动日志'
    )
    expect(logger.warn).toHaveBeenCalledWith('初始密码: aaaaaaaaaaaa')
    expect(logger.warn).not.toHaveBeenCalledWith('密码文件: /secure/.admin_bootstrap_password')

    randomSpy.mockRestore()
  })

  it('should remove stale bootstrap password files when applying an explicit admin password', () => {
    existsSync.mockReturnValue(true)
    getMock.mockReturnValue({
      username: 'admin',
      password: 'stored-hash',
      level: 3
    })
    process.env = { ...originalEnv, NODE_ENV: 'production', ADMIN_PASSWORD: 'replace-me-now' }

    adminBootstrapService.initAdminAccount()

    expect(rmSync).toHaveBeenCalledWith('/secure/.admin_bootstrap_password', { force: true })
    expect(logger.info).toHaveBeenCalledWith('管理员账户[admin]密码已通过环境变量成功强制更新')
  })

  it('should remove stale bootstrap password files when the stored password no longer matches', () => {
    existsSync.mockReturnValue(true)
    readFileSync.mockReturnValue(
      'username=admin\npassword=stale-pass\ngenerated_at=2026-04-12T00:00:00.000Z\n'
    )
    compareSync.mockReturnValue(false)
    getMock.mockReturnValue({
      username: 'admin',
      password: 'current-hash',
      level: 3
    })
    process.env = { ...originalEnv, NODE_ENV: 'production' }

    adminBootstrapService.initAdminAccount()

    expect(readFileSync).toHaveBeenCalledWith('/secure/.admin_bootstrap_password', 'utf8')
    expect(rmSync).toHaveBeenCalledWith('/secure/.admin_bootstrap_password', { force: true })
  })

  it('should remove expired bootstrap password files even when credentials still match', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-04-13T12:30:00.000Z'))
    existsSync.mockReturnValue(true)
    readFileSync.mockReturnValue(
      'username=admin\npassword=still-valid\ngenerated_at=2026-04-12T10:00:00.000Z\n'
    )
    compareSync.mockReturnValue(false)
    getMock.mockReturnValue({
      username: 'admin',
      password: 'current-hash',
      level: 3
    })
    process.env = { ...originalEnv, NODE_ENV: 'production' }

    adminBootstrapService.initAdminAccount()

    expect(rmSync).toHaveBeenCalledWith('/secure/.admin_bootstrap_password', { force: true })
    nowSpy.mockRestore()
  })

  it('should consume and delete bootstrap password files on first read', () => {
    existsSync.mockReturnValue(true)
    readFileSync.mockReturnValue(
      'username=admin\npassword=one-time\ngenerated_at=2026-04-12T10:00:00.000Z\n'
    )
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-04-12T10:30:00.000Z'))

    const result = consumeBootstrapPasswordFile()

    expect(result).toEqual({
      username: 'admin',
      password: 'one-time',
      generatedAt: '2026-04-12T10:00:00.000Z',
      expiresAt: '2026-04-13T10:00:00.000Z'
    })
    expect(rmSync).toHaveBeenCalledWith('/secure/.admin_bootstrap_password', { force: true })
    nowSpy.mockRestore()
  })

  it('should clear invalid bootstrap password files when consuming them', () => {
    existsSync.mockReturnValue(true)
    readFileSync.mockReturnValue('username=admin\npassword=broken\n')

    const result = consumeBootstrapPasswordFile()

    expect(result).toBeNull()
    expect(rmSync).toHaveBeenCalledWith('/secure/.admin_bootstrap_password', { force: true })
  })
})
