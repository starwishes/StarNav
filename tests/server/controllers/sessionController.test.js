import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sessionController } from '../../../src/server/controllers/sessionController.js'
import { sessionAccessService } from '../../../src/server/services/identity/sessionAccessService.js'

vi.mock('../../../src/server/services/identity/sessionAccessService.js', () => ({
  sessionAccessService: {
    getSessions: vi.fn(),
    revokeOthers: vi.fn(),
    revokeSession: vi.fn()
  }
}))

describe('SessionController Unit Tests', () => {
  let req
  let res

  beforeEach(() => {
    req = {
      params: { sessionId: 'session-2' },
      user: { username: 'alice', sessionId: 'session-1' },
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

  it('should delegate session listing to sessionAccessService', async () => {
    sessionAccessService.getSessions.mockReturnValue({
      success: true,
      message: 'Success',
      data: {
        sessions: [{ sessionId: 'session-1', isCurrent: true }]
      }
    })

    await sessionController.getSessions(req, res)

    expect(sessionAccessService.getSessions).toHaveBeenCalledWith(req.user)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: {
        sessions: [{ sessionId: 'session-1', isCurrent: true }]
      }
    })
  })

  it('should pass request context when revoking another session', async () => {
    sessionAccessService.revokeSession.mockReturnValue({ success: true, message: 'Success' })

    await sessionController.revokeSession(req, res)

    expect(sessionAccessService.revokeSession).toHaveBeenCalledWith(req.user, 'session-2', {
      ip: '127.0.0.1',
      userAgent: 'Vitest'
    })
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Success' })
  })
})
