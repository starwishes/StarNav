import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/services/identity/auditService.js', () => ({
  auditService: {
    log: vi.fn()
  }
}))

vi.mock('../../../src/server/services/identity/sessionService.js', () => ({
  sessionService: {
    getByUsername: vi.fn(),
    revokeOthers: vi.fn(),
    revoke: vi.fn()
  }
}))

const { auditService } = await import('../../../src/server/services/identity/auditService.js')
const { sessionService } = await import('../../../src/server/services/identity/sessionService.js')
const { sessionAccessService } = await import('../../../src/server/services/identity/sessionAccessService.js')

describe('sessionAccessService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks the current session when listing sessions', () => {
    sessionService.getByUsername.mockReturnValue([
      { sessionId: 'session-1', ip: '1.1.1.1' },
      { sessionId: 'session-2', ip: '1.1.1.2' }
    ])

    const result = sessionAccessService.getSessions({
      username: 'alice',
      sessionId: 'session-2'
    })

    expect(sessionService.getByUsername).toHaveBeenCalledWith('alice')
    expect(result).toEqual({
        sessions: [
          { sessionId: 'session-1', ip: '1.1.1.1', isCurrent: false },
          { sessionId: 'session-2', ip: '1.1.1.2', isCurrent: true }
        ]
      })
  })

  it('revokes other sessions and logs the revoke count', () => {
    sessionService.revokeOthers.mockReturnValue(3)

    const result = sessionAccessService.revokeOthers(
      { username: 'alice', sessionId: 'session-2' },
      { ip: '1.1.1.1' }
    )

    expect(sessionService.revokeOthers).toHaveBeenCalledWith('alice', 'session-2')
    expect(auditService.log).toHaveBeenCalledWith('revoke_sessions', {
      username: 'alice',
      revokedCount: 3,
      ip: '1.1.1.1'
    })
    expect(result).toEqual({
        revokedCount: 3
      })
  })

  it('rejects revoking foreign sessions and logs successful revocations', () => {
    sessionService.getByUsername.mockReturnValue([{ sessionId: 'session-1' }])

    expect(() => {
      sessionAccessService.revokeSession({ username: 'alice' }, 'session-9')
    }).toThrow('无权操作此会话')

    sessionService.getByUsername.mockReturnValue([{ sessionId: 'session-abcdef123456' }])

    const result = sessionAccessService.revokeSession(
      { username: 'alice' },
      'session-abcdef123456',
      { ip: '2.2.2.2' }
    )

    expect(sessionService.revoke).toHaveBeenCalledWith('session-abcdef123456')
    expect(auditService.log).toHaveBeenCalledWith('revoke_sessions', {
      username: 'alice',
      details: 'Revoked session: session-...',
      ip: '2.2.2.2'
    })
    expect(result).toEqual(undefined)
  })
})
