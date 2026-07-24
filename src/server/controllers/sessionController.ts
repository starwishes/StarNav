import type { Request, Response } from 'express'
import { sessionAccessService } from '../services/identity/sessionAccessService.js'
import { buildRequestContext } from '../utils/requestContext.js'
import { respondWithService } from '../utils/controllerResponder.js'
import type { AuthUserLike } from '../types/domain.js'

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  if (value == null) return fallback
  return String(value)
}

const requireUser = (req: Request): AuthUserLike & { sessionId?: string } => {
  if (!req.user?.username) {
    // Route is behind auth middleware; this is a type-narrowing guard only
    return { username: '' }
  }
  return req.user as AuthUserLike & { sessionId?: string }
}

export const sessionController = {
  getSessions: (req: Request, res: Response) => {
    return respondWithService(res, () => sessionAccessService.getSessions(requireUser(req)))
  },

  revokeOthers: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      sessionAccessService.revokeOthers(requireUser(req), buildRequestContext(req))
    )
  },

  revokeSession: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      sessionAccessService.revokeSession(
        requireUser(req),
        asString(req.params.sessionId),
        buildRequestContext(req)
      )
    )
  }
}
