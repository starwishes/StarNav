import type { Request, Response } from 'express'
import { adminIdentityService } from '../services/identity/adminIdentityService.js'
import { buildRequestContext } from '../utils/requestContext.js'
import { respondWithService } from '../utils/controllerResponder.js'

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  if (value == null) return fallback
  return String(value)
}

export const adminController = {
  getAuditLogs: (req: Request, res: Response) => {
    return respondWithService(res, () => adminIdentityService.getAuditLogs(req.query))
  },

  clearAuditLogs: (req: Request, res: Response) => {
    return respondWithService(res, () => adminIdentityService.clearAuditLogs(req.query))
  },

  getUsers: (_req: Request, res: Response) => {
    return respondWithService(res, () => adminIdentityService.getUsers())
  },

  createUser: (req: Request, res: Response) => {
    return respondWithService(res, () => adminIdentityService.createUser(req.body))
  },

  updateUser: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      adminIdentityService.updateUser(asString(req.params.username), req.body, {
        operator: req.user?.username,
        ...buildRequestContext(req)
      })
    )
  },

  deleteUser: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      adminIdentityService.deleteUser(asString(req.params.username), {
        operator: req.user?.username,
        ...buildRequestContext(req)
      })
    )
  }
}
