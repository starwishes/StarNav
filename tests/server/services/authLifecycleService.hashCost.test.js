// @vitest-environment node
// 第 20 轮 A2：登录"用户不存在"用 DUMMY_PASSWORD_HASH 做时序抹平，其 cost 必须与账号哈希
// （accountService.BCRYPT_COST = 12）一致，否则两条失败路径耗时错开，时序抹平失效。
// 用真实 bcrypt 断言两条失败路径实际比较的哈希都是 cost 12（不走热路径生成、仅字面量）。
import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

vi.mock('../../../src/server/services/database/database.js', () => ({
  getDb: () => {
    throw new Error('DB must not be touched in this unit test')
  }
}))

vi.mock('../../../src/server/services/identity/auditService.js', () => ({
  auditService: { log: vi.fn() }
}))

vi.mock('../../../src/server/services/identity/sessionService.js', () => ({
  sessionService: { create: vi.fn(), revoke: vi.fn() }
}))

vi.mock('../../../src/server/services/system/settingsService.js', () => ({
  settingsService: { get: vi.fn() }
}))

vi.mock('../../../src/server/services/identity/identityHelpers.js', () => ({
  buildAuthUser: vi.fn(),
  issueToken: vi.fn(),
  ensureStrongPassword: vi.fn(),
  DEFAULT_SESSION_DAYS: 30,
  REMEMBER_SESSION_DAYS: 90,
  sessionDaysToExpiresIn: vi.fn()
}))

vi.mock('../../../src/server/validation.js', () => ({
  loginSchema: { validate: vi.fn() }
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))

const { accountService, BCRYPT_COST } =
  await import('../../../src/server/services/identity/accountService.js')
const { auditService } = await import('../../../src/server/services/identity/auditService.js')
const { loginSchema } = await import('../../../src/server/validation.js')
const { authLifecycleService, DUMMY_PASSWORD_HASH } =
  await import('../../../src/server/services/identity/authLifecycleService.js')

const realCompareSync = bcrypt.compareSync.bind(bcrypt)

describe('authLifecycleService hash cost (timing-equalizer)', () => {
  let comparedHashes

  beforeEach(() => {
    vi.clearAllMocks()
    comparedHashes = []
    loginSchema.validate.mockReturnValue({ error: null })
    // 记录每条失败路径实际比较的哈希，同时保留真实比较开销以维持时序语义
    vi.spyOn(bcrypt, 'compareSync').mockImplementation((password, hash) => {
      comparedHashes.push(String(hash))
      return realCompareSync(password, hash)
    })
    vi.spyOn(accountService, 'findByUsername').mockReturnValue(null)
  })

  it('DUMMY_PASSWORD_HASH cost aligns with accountService.BCRYPT_COST', () => {
    // 断言指向 accountService.BCRYPT_COST（唯一事实源）而非硬编码 12：
    // 未来调整 cost 时只需同步改 accountService 与 DUMMY 字面量两处，测试自动跟随。
    expect(bcrypt.getRounds(DUMMY_PASSWORD_HASH)).toBe(BCRYPT_COST)
    expect(DUMMY_PASSWORD_HASH.startsWith('$2b$' + BCRYPT_COST + '$')).toBe(true)
  })

  it('compares against a cost-aligned hash when the user does not exist', () => {
    expect(() => {
      authLifecycleService.login({ username: 'ghost', password: 'WrongPass1!' }, { ip: '9.9.9.9' })
    }).toThrow('用户名或密码错误')

    expect(comparedHashes).toHaveLength(1)
    expect(bcrypt.getRounds(comparedHashes[0])).toBe(BCRYPT_COST)
    expect(auditService.log).toHaveBeenCalledWith('login', {
      username: 'ghost',
      ip: '9.9.9.9',
      userAgent: 'unknown',
      success: false
    })
  })

  it('compares against the stored hash when the password is wrong', () => {
    const storedHash = bcrypt.hashSync('Secret123!', BCRYPT_COST)
    vi.spyOn(accountService, 'findByUsername').mockReturnValue({
      username: 'alice',
      password: storedHash
    })

    expect(() => {
      authLifecycleService.login({ username: 'alice', password: 'WrongPass1!' }, { ip: '9.9.9.9' })
    }).toThrow('用户名或密码错误')

    expect(comparedHashes).toHaveLength(1)
    expect(comparedHashes[0]).toBe(storedHash)
    expect(bcrypt.getRounds(comparedHashes[0])).toBe(BCRYPT_COST)
  })
})
