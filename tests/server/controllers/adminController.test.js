import { beforeEach, describe, expect, it, vi } from 'vitest'

import { adminController } from '../../../src/server/controllers/adminController.js'

const { adminIdentityServiceMock } = vi.hoisted(() => ({
  adminIdentityServiceMock: {
    getAuditLogs: vi.fn(),
    clearAuditLogs: vi.fn(),
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn()
  }
}))

vi.mock('../../../src/server/services/identity/adminIdentityService.js', () => ({
  adminIdentityService: adminIdentityServiceMock
}))

const makeRequest = (overrides = {}) => ({
  query: {},
  body: {},
  params: {},
  headers: {},
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  ...overrides
})

const makeResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn()
  }
  return res
}

describe('adminController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates getAuditLogs to the service with the query', async () => {
    adminIdentityServiceMock.getAuditLogs.mockResolvedValue({ logs: [] })
    const req = makeRequest({ query: { page: '2', limit: '20' } })
    const res = makeResponse()

    await adminController.getAuditLogs(req, res)

    expect(adminIdentityServiceMock.getAuditLogs).toHaveBeenCalledWith({
      page: '2',
      limit: '20'
    })
    expect(res.json).toHaveBeenCalled()
  })

  it('delegates clearAuditLogs to the service with the query', async () => {
    adminIdentityServiceMock.clearAuditLogs.mockResolvedValue({ cleared: 3 })
    const req = makeRequest({ query: { before: '2026-04-01' } })
    const res = makeResponse()

    await adminController.clearAuditLogs(req, res)

    expect(adminIdentityServiceMock.clearAuditLogs).toHaveBeenCalledWith({
      before: '2026-04-01'
    })
    expect(res.json).toHaveBeenCalled()
  })

  it('delegates getUsers to the service', async () => {
    adminIdentityServiceMock.getUsers.mockResolvedValue([])
    const res = makeResponse()

    await adminController.getUsers(makeRequest(), res)

    expect(adminIdentityServiceMock.getUsers).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalled()
  })

  it('delegates createUser to the service with the body', async () => {
    adminIdentityServiceMock.createUser.mockResolvedValue({ success: true })
    const req = makeRequest({ body: { username: 'alice', password: 'pw', level: 1 } })
    const res = makeResponse()

    await adminController.createUser(req, res)

    expect(adminIdentityServiceMock.createUser).toHaveBeenCalledWith({
      username: 'alice',
      password: 'pw',
      level: 1
    })
  })

  it('delegates updateUser with a string username and operator context', async () => {
    adminIdentityServiceMock.updateUser.mockResolvedValue({ success: true })
    const req = makeRequest({
      params: { username: 'alice' },
      body: { level: 2 },
      user: { username: 'admin' }
    })
    const res = makeResponse()

    await adminController.updateUser(req, res)

    expect(adminIdentityServiceMock.updateUser).toHaveBeenCalledWith(
      'alice',
      { level: 2 },
      expect.objectContaining({ operator: 'admin', ip: '127.0.0.1' })
    )
  })

  it('normalizes array and non-string username params via asString', async () => {
    adminIdentityServiceMock.updateUser.mockResolvedValue({ success: true })

    const arrayReq = makeRequest({
      params: { username: ['bob'] },
      user: { username: 'admin' }
    })
    await adminController.updateUser(arrayReq, makeResponse())
    expect(adminIdentityServiceMock.updateUser).toHaveBeenCalledWith('bob', {}, expect.anything())

    const numberReq = makeRequest({ params: { username: 42 }, user: { username: 'admin' } })
    await adminController.updateUser(numberReq, makeResponse())
    expect(adminIdentityServiceMock.updateUser).toHaveBeenCalledWith('42', {}, expect.anything())
  })

  it('delegates deleteUser with the username and operator context', async () => {
    adminIdentityServiceMock.deleteUser.mockResolvedValue({ success: true })
    const req = makeRequest({
      params: { username: 'alice' },
      user: { username: 'admin' }
    })
    const res = makeResponse()

    await adminController.deleteUser(req, res)

    expect(adminIdentityServiceMock.deleteUser).toHaveBeenCalledWith(
      'alice',
      expect.objectContaining({ operator: 'admin' })
    )
  })
})
