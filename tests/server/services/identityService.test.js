import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accountService } from '../../../src/server/services/identity/accountService.js'
import { clearBootstrapPasswordFile } from '../../../src/server/services/identity/adminBootstrapService.js'
import { auditService } from '../../../src/server/services/identity/auditService.js'
import { sessionService } from '../../../src/server/services/identity/sessionService.js'
import { settingsService } from '../../../src/server/services/system/settingsService.js'
import { loginSchema, strongPasswordSchema } from '../../../src/server/middleware/validation.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { adminIdentityService } from '../../../src/server/services/identity/adminIdentityService.js'
import { authLifecycleService } from '../../../src/server/services/identity/authLifecycleService.js'
import { sessionAccessService } from '../../../src/server/services/identity/sessionAccessService.js'

vi.mock('../../../src/server/services/identity/accountService.js')
vi.mock('../../../src/server/services/identity/adminBootstrapService.js', () => ({
  clearBootstrapPasswordFile: vi.fn()
}))
vi.mock('../../../src/server/services/identity/auditService.js')
vi.mock('../../../src/server/services/identity/sessionService.js')
vi.mock('../../../src/server/services/system/settingsService.js')
vi.mock('../../../src/server/middleware/validation.js')
vi.mock('jsonwebtoken')
vi.mock('bcryptjs')

describe('Identity Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginSchema.validate = vi.fn().mockReturnValue({ error: null })
    strongPasswordSchema.validate = vi.fn().mockReturnValue({ error: null })
  })

  it('should login successfully and return token, user and session', () => {
    accountService.findByUsername.mockReturnValue({
      username: 'alice',
      password: 'hashed',
      level: 2
    })
    bcrypt.compareSync.mockReturnValue(true)
    sessionService.create.mockReturnValue('session-1')
    jwt.sign.mockReturnValue('token-1')

    const result = authLifecycleService.login(
      { username: 'alice', password: 'secret' },
      { ip: '1.1.1.1', userAgent: 'Vitest' }
    )

    expect(result).toEqual({
      token: 'token-1',
      user: {
        login: 'alice',
        name: 'alice',
        level: 2
      },
      sessionId: 'session-1',
      expiresInDays: 30
    })
    expect(sessionService.create).toHaveBeenCalledWith('alice', '1.1.1.1', 'Vitest', {
      expiresInDays: 30
    })
    expect(accountService.updateLastLogin).toHaveBeenCalledWith('alice')
    expect(auditService.log).toHaveBeenCalledWith(
      'login',
      expect.objectContaining({ username: 'alice', success: true })
    )
  })

  it('should extend session to 90 days when remember is requested', () => {
    accountService.findByUsername.mockReturnValue({
      username: 'alice',
      password: 'hashed',
      level: 2
    })
    bcrypt.compareSync.mockReturnValue(true)
    sessionService.create.mockReturnValue('session-2')
    jwt.sign.mockReturnValue('token-2')

    const result = authLifecycleService.login(
      { username: 'alice', password: 'secret', remember: true },
      { ip: '1.1.1.1', userAgent: 'Vitest' }
    )

    expect(result.expiresInDays).toBe(90)
    expect(sessionService.create).toHaveBeenCalledWith('alice', '1.1.1.1', 'Vitest', {
      expiresInDays: 90
    })
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      expect.objectContaining({ expiresIn: '90d' })
    )
  })

  it('should revoke all sessions before deleting a user', () => {
    accountService.findByUsername.mockReturnValue({ username: 'alice', level: 1 })
    accountService.delete.mockReturnValue(true)
    sessionService.revokeByUsername.mockReturnValue(2)

    const result = adminIdentityService.deleteUser('alice', {
      operator: 'admin',
      ip: '127.0.0.1',
      userAgent: 'Vitest'
    })

    expect(sessionService.revokeByUsername).toHaveBeenCalledWith('alice')
    expect(accountService.delete).toHaveBeenCalledWith('alice')
    expect(result).toEqual(undefined)
  })

  it('should reject revoking a session that does not belong to the user', () => {
    sessionService.getByUsername.mockReturnValue([{ sessionId: 'session-1' }])

    expect(() => {
      sessionAccessService.revokeSession({ username: 'alice', sessionId: 'session-1' }, 'session-9')
    }).toThrow('无权操作此会话')
  })

  it('should clear bootstrap password file when admin updates bootstrap account credentials', () => {
    accountService.findByUsername.mockReturnValue({ username: 'admin', level: 3 })
    accountService.update.mockReturnValue({
      username: 'admin',
      level: 3
    })

    adminIdentityService.updateUser(
      'admin',
      { password: 'Secret123!', level: 3 },
      { operator: 'root' }
    )

    expect(clearBootstrapPasswordFile).toHaveBeenCalled()
  })

  it('should reject registration when public registration is disabled', () => {
    settingsService.get.mockReturnValue(false)

    expect(() => {
      authLifecycleService.register({ username: 'alice', password: 'Secret123!' })
    }).toThrow('注册功能已关闭')
  })
})
