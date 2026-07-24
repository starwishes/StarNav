import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/services/identity/accountService.js', () => ({
  accountService: {
    getAll: vi.fn(),
    findByUsername: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('../../../src/server/services/identity/adminBootstrapService.js', () => ({
  clearBootstrapPasswordFile: vi.fn()
}))

vi.mock('../../../src/server/services/identity/auditService.js', () => ({
  auditService: {
    getLogs: vi.fn(),
    clear: vi.fn(),
    log: vi.fn()
  }
}))

vi.mock('../../../src/server/services/identity/sessionService.js', () => ({
  sessionService: {
    revokeByUsername: vi.fn()
  }
}))

vi.mock('../../../src/server/services/identity/identityHelpers.js', () => ({
  ensureExistingUser: vi.fn(),
  ensureStrongPassword: vi.fn()
}))

const { accountService } = await import('../../../src/server/services/identity/accountService.js')
const { clearBootstrapPasswordFile } =
  await import('../../../src/server/services/identity/adminBootstrapService.js')
const { auditService } = await import('../../../src/server/services/identity/auditService.js')
const { sessionService } = await import('../../../src/server/services/identity/sessionService.js')
const { ensureExistingUser, ensureStrongPassword } =
  await import('../../../src/server/services/identity/identityHelpers.js')
const { adminIdentityService } = await import('../../../src/server/services/identity/adminIdentityService.js')

describe('adminIdentityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses pagination defaults for audit logs and surfaces clear failures', () => {
    auditService.getLogs.mockReturnValue({ total: 2, logs: [{ id: 1 }] })

    expect(adminIdentityService.getAuditLogs({ page: '2', limit: '10' })).toEqual({ total: 2, logs: [{ id: 1 }] })
    expect(auditService.getLogs).toHaveBeenCalledWith(2, 10)

    adminIdentityService.getAuditLogs({})
    expect(auditService.getLogs).toHaveBeenLastCalledWith(1, 50)

    auditService.clear.mockReturnValue(false)
    expect(() => {
      adminIdentityService.clearAuditLogs()
    }).toThrow('清空失败')
  })

  it('returns users and creates users with duplicate/internal failure handling', () => {
    accountService.getAll.mockReturnValue([{ username: 'alice', level: 1 }])
    expect(adminIdentityService.getUsers()).toEqual([{ username: 'alice', level: 1 }])

    accountService.findByUsername.mockReturnValueOnce({ username: 'alice' })
    expect(() => {
      adminIdentityService.createUser({ username: 'alice', password: 'Secret123!', level: 1 })
    }).toThrow('用户已存在')

    accountService.findByUsername.mockReturnValueOnce(null)
    accountService.create.mockReturnValueOnce(null)
    expect(() => {
      adminIdentityService.createUser({ username: 'alice', password: 'Secret123!', level: 1 })
    }).toThrow('创建用户失败')

    accountService.findByUsername.mockReturnValueOnce(null)
    accountService.create.mockReturnValueOnce({ username: 'alice', level: 1 })
    expect(
      adminIdentityService.createUser({ username: 'alice', password: 'Secret123!', level: 1 })
    ).toEqual(undefined)
    expect(ensureStrongPassword).toHaveBeenCalledWith({
      username: 'alice',
      password: 'Secret123!',
      level: 1
    })
  })

  it('updates users, validates password changes, logs audit entries, and handles failures', () => {
    ensureExistingUser.mockReturnValue({ username: 'admin', level: 3 })

    accountService.update.mockReturnValueOnce({ error: '用户名已存在' })
    expect(() => {
      adminIdentityService.updateUser('admin', { username: 'owner' }, {})
    }).toThrow('用户名已存在')

    accountService.update.mockReturnValueOnce(null)
    expect(() => {
      adminIdentityService.updateUser('admin', { username: 'owner' }, {})
    }).toThrow('更新失败')

    accountService.update.mockReturnValueOnce({ username: 'owner', level: 3 })
    const result = adminIdentityService.updateUser(
      'admin',
      { newUsername: 'owner', password: 'Secret123!', level: 3 },
      { operator: 'root', ip: '1.1.1.1', userAgent: 'Vitest' }
    )

    expect(ensureStrongPassword).toHaveBeenCalledWith({
      username: 'owner',
      password: 'Secret123!',
      level: 3
    })
    expect(sessionService.revokeByUsername).toHaveBeenCalledWith('admin')
    expect(sessionService.revokeByUsername).toHaveBeenCalledWith('owner')
    expect(clearBootstrapPasswordFile).toHaveBeenCalled()
    expect(auditService.log).toHaveBeenCalledWith('admin_update_user', {
      username: 'root',
      ip: '1.1.1.1',
      userAgent: 'Vitest',
      details: 'Updated user: admin -> owner'
    })
    expect(result).toEqual({
        user: {
          username: 'owner',
          level: 3
        }
      })
  })

  it('revokes sessions before delete and logs audit entries with defaults', () => {
    ensureExistingUser.mockReturnValue({ username: 'alice', level: 1 })
    accountService.delete.mockReturnValueOnce(false)

    expect(() => {
      adminIdentityService.deleteUser('alice')
    }).toThrow('用户不存在')
    expect(sessionService.revokeByUsername).toHaveBeenCalledWith('alice')

    accountService.delete.mockReturnValueOnce(true)
    const result = adminIdentityService.deleteUser('alice', { operator: 'admin' })

    expect(auditService.log).toHaveBeenCalledWith('admin_delete_user', {
      username: 'admin',
      ip: 'unknown',
      userAgent: 'unknown',
      details: 'Deleted user: alice'
    })
    expect(result).toEqual(undefined)
  })
})
