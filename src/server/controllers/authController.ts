import type { Request, Response } from 'express'
import { authLifecycleService } from '../services/identity/authLifecycleService.js'
import {
  createAuthCookieHeader,
  clearAuthCookieHeader,
  shouldUseSecureAuthCookie
} from '../utils/authCookie.js'
import { buildRequestContext } from '../utils/requestContext.js'
import { isExtensionOrigin, validateTrustedWriteOrigin } from '../utils/requestOrigin.js'
import { errors } from '../utils/errors.js'
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

/** 读取 Origin 请求头（可能为数组），取首个值。 */
const readOriginHeader = (req: Request): string | undefined => {
  const header = req.headers?.origin
  return Array.isArray(header) ? header[0] : header
}

/**
 * 判断请求是否来自浏览器 Web 页面：POST + JSON 的浏览器请求会携带
 * http/https 的 Origin（同源 fetch 也会），或至少 Referer。
 * CLI/脚本/扩展等非浏览器客户端无此头，也不存在 XSS 窃取场景。
 */
const isBrowserWebRequest = (req: Request): boolean => {
  const refererHeader = req.headers?.referer
  const referer = Array.isArray(refererHeader) ? refererHeader[0] : refererHeader
  const value = (readOriginHeader(req) || referer || '').trim()
  return /^https?:\/\//i.test(value)
}

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
      // 会话由 HttpOnly Cookie 承载；浏览器 Web 页面请求（http/https Origin/Referer）
      // 响应体剥离 token，避免 XSS 窃取长效令牌。浏览器扩展（chrome-extension://）与
      // CLI/脚本等无 Origin 的客户端依赖 Bearer token 调用 API，响应体保留 token。
      const isExtensionClient = isExtensionOrigin(readOriginHeader(req))
      const keepTokenInBody = !isBrowserWebRequest(req) || isExtensionClient
      const body = keepTokenInBody
        ? buildSuccessBody(result)
        : buildSuccessBody({
            user: result.user,
            sessionId: result.sessionId,
            expiresInDays
          })
      return withCookieHeader(
        body,
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
