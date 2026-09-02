// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/services/identity/accountService.js', () => ({
  accountService: {
    findByUsername: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateLastLogin: vi.fn()
  }
}))

vi.mock('../../../src/server/services/identity/auditService.js', () => ({
  auditService: {
    log: vi.fn()
  }
}))

vi.mock('../../../src/server/services/identity/sessionService.js', () => ({
  sessionService: {
    create: vi.fn(),
    revoke: vi.fn()
  }
}))

vi.mock('../../../src/server/services/system/settingsService.js', () => ({
  settingsService: {
    get: vi.fn()
  }
}))

vi.mock('../../../src/server/services/identity/identityHelpers.js', () => ({
  buildAuthUser: vi.fn((user) => ({
    login: user.username,
    name: user.username,
    level: user.level
  })),
  ensureStrongPassword: vi.fn(),
  issueToken: vi.fn()
}))

vi.mock('../../../src/server/validation.js', () => ({
  loginSchema: {
    validate: vi.fn()
  }
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn()
  }
}))

vi.mock('bcryptjs', () => ({
  default: {
    compareSync: vi.fn()
  }
}))

const { accountService } = await import('../../../src/server/services/identity/accountService.js')
const { auditService } = await import('../../../src/server/services/identity/auditService.js')
const { sessionService } = await import('../../../src/server/services/identity/sessionService.js')
const { settingsService } = await import('../../../src/server/services/system/settingsService.js')
const { ensureStrongPassword, issueToken } =
  await import('../../../src/server/services/identity/identityHelpers.js')
const { loginSchema } = await import('../../../src/server/validation.js')
const { logger } = await import('../../../src/server/utils/logger.js')
const bcrypt = (await import('bcryptjs')).default
const { authLifecycleService } =
  await import('../../../src/server/services/identity/authLifecycleService.js')

describe('authLifecycleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginSchema.validate.mockReturnValue({ error: null })
    settingsService.get.mockReturnValue(true)
    issueToken.mockReturnValue('token-1')
  })

  it('rejects invalid login payloads before touching user data', () => {
    loginSchema.validate.mockReturnValue({ error: { details: [{ message: 'bad' }] } })

    expect(() => {
      authLifecycleService.login({ username: 'x' })
    }).toThrow('输入格式不正确')

    expect(accountService.findByUsername).not.toHaveBeenCalled()
  })

  it('logs failed login attempts and rejects invalid credentials', () => {
    accountService.findByUsername.mockReturnValue({ username: 'alice', password: 'hashed' })
    bcrypt.compareSync.mockReturnValue(false)

    expect(() => {
      authLifecycleService.login(
        { username: 'alice', password: 'wrong' },
        { ip: '1.1.1.1', userAgent: 'Vitest' }
      )
    }).toThrow('用户名或密码错误')

    expect(auditService.log).toHaveBeenCalledWith('login', {
      username: 'alice',
      ip: '1.1.1.1',
      userAgent: 'Vitest',
      success: false
    })
    expect(logger.warn).toHaveBeenCalledWith('登录失败尝试: alice')
  })

  it('logs out current sessions and skips revocation when no session is present', () => {
    expect(
      authLifecycleService.logout({ username: 'alice', sessionId: 'session-1' }, { ip: '1.1.1.1' })
    ).toEqual(undefined)
    expect(sessionService.revoke).toHaveBeenCalledWith('session-1')
    expect(auditService.log).toHaveBeenCalledWith('logout', {
      username: 'alice',
      ip: '1.1.1.1'
    })

    vi.clearAllMocks()
    expect(authLifecycleService.logout({ username: 'alice' })).toEqual(undefined)
    expect(sessionService.revoke).not.toHaveBeenCalled()
    expect(auditService.log).not.toHaveBeenCalled()
  })

  it('registers users, rejects duplicates, and surfaces internal create failures', () => {
    accountService.findByUsername.mockReturnValue(null)
    accountService.create.mockReturnValue({ username: 'alice' })

    expect(
      authLifecycleService.register(
        { username: 'alice', password: 'Secret123!' },
        { ip: '1.1.1.1' }
      )
    ).toEqual(undefined)
    expect(ensureStrongPassword).toHaveBeenCalledWith({
      username: 'alice',
      password: 'Secret123!'
    })
    expect(auditService.log).toHaveBeenCalledWith('register', {
      username: 'alice',
      ip: '1.1.1.1'
    })
    expect(logger.info).toHaveBeenCalledWith('新用户注册: alice')

    accountService.findByUsername.mockReturnValueOnce({ username: 'alice' })
    expect(() => {
      authLifecycleService.register({ username: 'alice', password: 'Secret123!' })
    }).toThrow('该用户名已被注册')

    accountService.findByUsername.mockReturnValueOnce(null)
    accountService.create.mockReturnValueOnce(null)
    expect(() => {
      authLifecycleService.register({ username: 'bob', password: 'Secret123!' })
    }).toThrow('注册失败')
  })
})
