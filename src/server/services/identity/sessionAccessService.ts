import { auditService } from './auditService.js'
import { sessionService } from './sessionService.js'
import { errors } from '../../middleware/errorHandler.js'
import type { AuthUserLike, RequestContextLike } from '../../types/domain.js'

type CurrentUser = AuthUserLike & { sessionId?: string }

export const sessionAccessService = {
  getSessions(currentUser: CurrentUser) {
    const sessions = sessionService.getByUsername(currentUser.username) as Array<
      Record<string, unknown> & { sessionId?: string }
    >

    return {
      sessions: sessions.map((session) => ({
        ...session,
        isCurrent: session.sessionId === currentUser.sessionId
      }))
    }
  },

  revokeOthers(currentUser: CurrentUser, context: RequestContextLike = {}) {
    const revokedCount = sessionService.revokeOthers(
      currentUser.username,
      currentUser.sessionId || ''
    )

    auditService.log('revoke_sessions', {
      username: currentUser.username,
      revokedCount,
      ip: context.ip || 'unknown'
    })

    return {
      revokedCount
    }
  },

  revokeSession(currentUser: CurrentUser, sessionId: string, context: RequestContextLike = {}) {
    const sessions = sessionService.getByUsername(currentUser.username) as Array<
      Record<string, unknown> & { sessionId?: string }
    >
    if (!sessions.some((session) => session.sessionId === sessionId)) {
      throw errors.forbidden('无权操作此会话')
    }

    sessionService.revoke(sessionId)

    const shortId = sessionId.substring(0, 8)
    auditService.log('revoke_sessions', {
      username: currentUser.username,
      details: 'Revoked session: ' + shortId + '...',
      ip: context.ip || 'unknown'
    })

    return undefined
  }
}
