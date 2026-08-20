import type { Request, Response } from 'express'
import { authLifecycleService } from '../services/identity/authLifecycleService.js'
import {
  createAuthCookieHeader,
  clearAuthCookieHeader,
  shouldUseSecureAuthCookie
} from '../utils/authCookie.js'
import { buildRequestContext } from '../utils/requestContext.js'
import { validateTrustedWriteOrigin } from '../utils/requestOrigin.js'
import { errors } from '../middleware/errorHandler.js'
import { respondWithService } from '../utils/controllerResponder.js'
import { buildSuccessBody } from '../utils/response.js'
import {
  DEFAULT_SESSION_DAYS,
  REMEMBER_SESSION_DAYS
} from '../services/identity/identityHelpers.js'

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
      // 登录 CSRF 防护：跨站表单 POST 会携带 Origin/Referer。
      // 若来源头存在且未通过同源/白名单校验则拒绝；无来源头的请求
      // （CLI、浏览器插件、同源 fetch）放行，与现有 cookie 写请求策略一致。
      // 浏览器扩展来源(chrome-extension://)允许登录：无 cookie 可窃取，无 CSRF 风险。
      const originCheck = validateTrustedWriteOrigin(req, { allowExtensionOrigins: true })
      if (originCheck.source && !originCheck.trusted) {
        throw errors.forbidden('请求来源无效')
      }

      const result = await authLifecycleService.login(req.body, buildRequestContext(req))
      // remember=true 时延长到 90 天，默认 30 天，cookie / JWT / session 三处保持一致。
      const remember = req.body?.remember === true
      const expiresInDays =
        result.expiresInDays || (remember ? REMEMBER_SESSION_DAYS : DEFAULT_SESSION_DAYS)
      const maxAgeMs = expiresInDays * 24 * 60 * 60 * 1000
      return withCookieHeader(
        buildSuccessBody(result),
        createAuthCookieHeader(result.token, {
          maxAge: maxAgeMs,
          expires: new Date(Date.now() + maxAgeMs),
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
