// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sessionController } from '../../../src/server/controllers/sessionController.js'

const { sessionAccessServiceMock } = vi.hoisted(() => ({
  sessionAccessServiceMock: {
    getSessions: vi.fn(),
    revokeOthers: vi.fn(),
    revokeSession: vi.fn()
  }
}))

vi.mock('../../../src/server/services/identity/sessionAccessService.js', () => ({
  sessionAccessService: sessionAccessServiceMock
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
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() }
  return res
}

describe('sessionController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates getSessions with the authenticated user', async () => {
    sessionAccessServiceMock.getSessions.mockResolvedValue([])
    const req = makeRequest({ user: { username: 'alice', sessionId: 's1' } })

    await sessionController.getSessions(req, makeResponse())

    expect(sessionAccessServiceMock.getSessions).toHaveBeenCalledWith({
      username: 'alice',
      sessionId: 's1'
    })
  })

  it('falls back to an empty user when the request has no authenticated user', async () => {
    sessionAccessServiceMock.getSessions.mockResolvedValue([])

    await sessionController.getSessions(makeRequest(), makeResponse())

    expect(sessionAccessServiceMock.getSessions).toHaveBeenCalledWith({ username: '' })
  })

  it('delegates revokeOthers with user and request context', async () => {
    sessionAccessServiceMock.revokeOthers.mockResolvedValue({ revokedCount: 2 })
    const req = makeRequest({ user: { username: 'alice' } })

    await sessionController.revokeOthers(req, makeResponse())

    expect(sessionAccessServiceMock.revokeOthers).toHaveBeenCalledWith(
      { username: 'alice' },
      expect.objectContaining({ ip: '127.0.0.1' })
    )
  })

  it('delegates revokeSession with a normalized session id', async () => {
    sessionAccessServiceMock.revokeSession.mockResolvedValue({ success: true })

    await sessionController.revokeSession(
      makeRequest({ params: { sessionId: 'abc' }, user: { username: 'alice' } }),
      makeResponse()
    )
    expect(sessionAccessServiceMock.revokeSession).toHaveBeenCalledWith(
      { username: 'alice' },
      'abc',
      expect.anything()
    )

    await sessionController.revokeSession(
      makeRequest({ params: { sessionId: ['def'] }, user: { username: 'alice' } }),
      makeResponse()
    )
    expect(sessionAccessServiceMock.revokeSession).toHaveBeenCalledWith(
      { username: 'alice' },
      'def',
      expect.anything()
    )
  })
})
