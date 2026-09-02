// @vitest-environment node
// 第 17 轮收口：断言 adminBootstrapService 写入数据库的哈希确实以共享 BCRYPT_COST(=12)
// 生成（真实 bcrypt），覆盖 compose ADMIN_PASSWORD 首次启动与强制更新两条路径。
import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

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

const { adminBootstrapService } =
  await import('../../../src/server/services/identity/adminBootstrapService.js')

describe('AdminBootstrapService hash cost', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, NODE_ENV: 'test' }
  })

  it('should hash the ADMIN_PASSWORD bootstrap insert with cost 12', () => {
    getMock.mockReturnValue(undefined)
    process.env = { ...originalEnv, NODE_ENV: 'production', ADMIN_PASSWORD: 'BootstrapPass1!' }

    adminBootstrapService.initAdminAccount()

    expect(runMock).toHaveBeenCalledTimes(1)
    const storedHash = runMock.mock.calls[0][1]
    expect(bcrypt.getRounds(storedHash)).toBe(12)
    expect(bcrypt.compareSync('BootstrapPass1!', storedHash)).toBe(true)
  })

  it('should hash the ADMIN_PASSWORD forced update with cost 12', () => {
    // 旧哈希用低 cost 生成仅用于加速测试；cost 差异不影响 compareSync 语义
    const oldHash = bcrypt.hashSync('OldPass1!', 4)
    getMock.mockReturnValue({
      username: 'admin',
      password: oldHash,
      level: 3
    })
    process.env = { ...originalEnv, NODE_ENV: 'production', ADMIN_PASSWORD: 'NewPass2!' }

    adminBootstrapService.initAdminAccount()

    expect(runMock).toHaveBeenCalledTimes(1)
    const storedHash = runMock.mock.calls[0][0]
    expect(runMock.mock.calls[0][1]).toBe('admin')
    expect(bcrypt.getRounds(storedHash)).toBe(12)
    expect(bcrypt.compareSync('NewPass2!', storedHash)).toBe(true)
  })
})
