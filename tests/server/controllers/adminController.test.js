import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminController } from '../../../src/server/controllers/adminController.js'
import { adminIdentityService } from '../../../src/server/services/identity/adminIdentityService.js'

vi.mock('../../../src/server/services/identity/adminIdentityService.js', () => ({
  adminIdentityService: {
    getAuditLogs: vi.fn(),
    clearAuditLogs: vi.fn(),
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn()
  }
}))

describe('AdminController Unit Tests', () => {
  let req
  let res

  beforeEach(() => {
    req = {
      params: { username: 'alice' },
      body: {},
      query: {},
      user: { username: 'admin' },
      headers: { 'user-agent': 'Vitest' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }

    vi.clearAllMocks()
  })

  it('should delegate getUsers to identityService', async () => {
    adminIdentityService.getUsers.mockReturnValue({
      success: true,
      message: 'Success',
      data: [{ username: 'alice', level: 1 }]
    })

    await adminController.getUsers(req, res)

    expect(adminIdentityService.getUsers).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: [{ username: 'alice', level: 1 }]
    })
  })

  it('should pass request context when updating a user', async () => {
    adminIdentityService.updateUser.mockReturnValue({
      success: true,
      message: 'Success',
      data: {
        user: { username: 'alice-2', level: 2 }
      }
    })
    req.body = { newUsername: 'alice-2', level: 2 }

    await adminController.updateUser(req, res)

    expect(adminIdentityService.updateUser).toHaveBeenCalledWith('alice', req.body, {
      operator: 'admin',
      ip: '127.0.0.1',
      userAgent: 'Vitest'
    })
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: {
        user: { username: 'alice-2', level: 2 }
      }
    })
  })

  it('should pass request context when deleting a user', async () => {
    adminIdentityService.deleteUser.mockReturnValue({ success: true, message: 'Success' })

    await adminController.deleteUser(req, res)

    expect(adminIdentityService.deleteUser).toHaveBeenCalledWith('alice', {
      operator: 'admin',
      ip: '127.0.0.1',
      userAgent: 'Vitest'
    })
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Success' })
  })
})
