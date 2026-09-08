// @vitest-environment node
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
const { adminIdentityService } =
  await import('../../../src/server/services/identity/adminIdentityService.js')

describe('adminIdentityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses pagination defaults for audit logs and surfaces clear failures', () => {
    auditService.getLogs.mockReturnValue({ total: 2, logs: [{ id: 1 }] })

    expect(adminIdentityService.getAuditLogs({ page: '2', limit: '10' })).toEqual({
      total: 2,
      logs: [{ id: 1 }]
    })
    expect(auditService.getLogs).toHaveBeenCalledWith(2, 10)

    adminIdentityService.getAuditLogs({})
    expect(auditService.getLogs).toHaveBeenLastCalledWith(1, 50)

    auditService.clear.mockReturnValue(false)
    expect(() => {
      adminIdentityService.clearAuditLogs()
    }).toThrow('清空失败')
  })

  it('clamps audit pagination to sane bounds', () => {
    auditService.getLogs.mockReturnValue({ total: 0, logs: [] })

    adminIdentityService.getAuditLogs({ page: '-5', limit: '999999' })
    expect(auditService.getLogs).toHaveBeenLastCalledWith(1, 200)

    adminIdentityService.getAuditLogs({ page: '0', limit: '0' })
    expect(auditService.getLogs).toHaveBeenLastCalledWith(1, 1)
  })

  it('forwards a validated before date to auditService.clear', () => {
    auditService.clear.mockReturnValue(true)

    expect(adminIdentityService.clearAuditLogs({ before: '2026-07-26 00:00:00' })).toBeUndefined()
    expect(auditService.clear).toHaveBeenCalledWith('2026-07-26 00:00:00')

    adminIdentityService.clearAuditLogs({ before: '2026-07-26' })
    expect(auditService.clear).toHaveBeenLastCalledWith('2026-07-26')
  })

  it('omits before for a full clear', () => {
    auditService.clear.mockReturnValue(true)

    adminIdentityService.clearAuditLogs()

    expect(auditService.clear).toHaveBeenCalledWith(undefined)
  })

  it('rejects invalid or impossible before values without touching the store', () => {
    for (const invalid of ['zzzz', '2026-13-99', '2026-02-30', ['2026-01-01', '2026-02-01']]) {
      expect(() => {
        adminIdentityService.clearAuditLogs({ before: invalid })
      }).toThrow('无效的 before 参数')
    }
    expect(auditService.clear).not.toHaveBeenCalled()
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

  it('updates users, logs audit entries, and handles accountService failures', () => {
    ensureExistingUser.mockReturnValue({ username: 'alice', level: 1 })

    accountService.update.mockReturnValueOnce({ error: '用户名已存在' })
    expect(() => {
      adminIdentityService.updateUser('alice', { newUsername: 'owner' }, {})
    }).toThrow('用户名已存在')

    accountService.update.mockReturnValueOnce(null)
    expect(() => {
      adminIdentityService.updateUser('alice', { newUsername: 'owner' }, {})
    }).toThrow('更新失败')

    accountService.update.mockReturnValueOnce({ username: 'owner', level: 3 })
    const result = adminIdentityService.updateUser(
      'alice',
      { newUsername: 'owner', password: 'Secret123!', level: 3 },
      { operator: 'root', ip: '1.1.1.1', userAgent: 'Vitest' }
    )

    expect(sessionService.revokeByUsername).toHaveBeenCalledWith('alice')
    expect(sessionService.revokeByUsername).toHaveBeenCalledWith('owner')
    // 非主管理员改名不触发 bootstrap 密码文件清理
    expect(clearBootstrapPasswordFile).not.toHaveBeenCalled()
    expect(auditService.log).toHaveBeenCalledWith('admin_update_user', {
      username: 'root',
      ip: '1.1.1.1',
      userAgent: 'Vitest',
      details: 'Updated user: alice -> owner'
    })
    expect(result).toEqual({
      user: {
        username: 'owner',
        level: 3
      }
    })
  })

  it('validates level/newUsername/password even when no password is supplied (round-27 M1)', () => {
    ensureExistingUser.mockReturnValue({ username: 'alice', level: 1 })

    // 非数值 level 曾原样入库并让 requireAdmin 对 NaN fail-open
    expect(() => {
      adminIdentityService.updateUser('alice', { level: 'boss' }, {})
    }).toThrow()
    expect(accountService.update).not.toHaveBeenCalled()

    // 越界 level 拒绝（可见性仅 0..3）
    expect(() => {
      adminIdentityService.updateUser('alice', { level: 99 }, {})
    }).toThrow()
    expect(accountService.update).not.toHaveBeenCalled()

    // 非法 newUsername 会改砖（登录校验 alphanum 3-30），拒绝
    expect(() => {
      adminIdentityService.updateUser('alice', { newUsername: 'a b!' }, {})
    }).toThrow()
    expect(accountService.update).not.toHaveBeenCalled()

    // 弱密码拒绝
    expect(() => {
      adminIdentityService.updateUser('alice', { newUsername: 'owner', password: 'weakpass1' }, {})
    }).toThrow()
    expect(accountService.update).not.toHaveBeenCalled()
  })

  it('rejects self-demotion below admin but allows demoting other users (round-30 M1)', () => {
    ensureExistingUser.mockReturnValue({ username: 'alice', level: 3 })

    expect(() => {
      adminIdentityService.updateUser('alice', { level: 0 }, { operator: 'alice' })
    }).toThrow('不能降级当前登录的管理员账户')
    expect(accountService.update).not.toHaveBeenCalled()

    accountService.update.mockReturnValueOnce({ username: 'alice', level: 1 })
    expect(adminIdentityService.updateUser('alice', { level: 1 }, { operator: 'root' })).toEqual({
      user: { username: 'alice', level: 1 }
    })
  })

  it('protects the master admin from rename and from demotion below admin (round-27 M1)', () => {
    ensureExistingUser.mockReturnValue({ username: 'admin', level: 3 })

    expect(() => {
      adminIdentityService.updateUser('admin', { newUsername: 'root' }, {})
    }).toThrow('不能重命名主管理员账户')

    expect(() => {
      adminIdentityService.updateUser('admin', { level: 0 }, {})
    }).toThrow('不能将主管理员降级为非管理员')

    expect(accountService.update).not.toHaveBeenCalled()
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
