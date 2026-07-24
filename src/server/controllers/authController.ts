import type { Request, Response } from 'express'
import { authLifecycleService } from '../services/identity/authLifecycleService.js'
import {
  createAuthCookieHeader,
  clearAuthCookieHeader,
  shouldUseSecureAuthCookie
} from '../utils/authCookie.js'
import { buildRequestContext } from '../utils/requestContext.js'
import { respondWithService } from '../utils/controllerResponder.js'
import { buildSuccessBody } from '../utils/response.js'

const withCookieHeader = (body: unknown, cookieHeader: string) => ({
  statusCode: 200,
  headers: {
    'Set-Cookie': cookieHeader
  },
  body
})

export const authController = {
  login: (req: Request, res: Response) => {
    return respondWithService(res, async () => {
      const result = await authLifecycleService.login(req.body, buildRequestContext(req))
      return withCookieHeader(
        buildSuccessBody(result),
        createAuthCookieHeader(result.token, {
          secure: shouldUseSecureAuthCookie(req)
        })
      )
    })
  },

  logout: (req: Request, res: Response) => {
    return respondWithService(res, async () => {
      await authLifecycleService.logout(req.user, buildRequestContext(req))
      return withCookieHeader(
        buildSuccessBody(),
        clearAuthCookieHeader({
          secure: shouldUseSecureAuthCookie(req)
        })
      )
    })
  },

  register: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      authLifecycleService.register(req.body, buildRequestContext(req))
    )
  }
}
