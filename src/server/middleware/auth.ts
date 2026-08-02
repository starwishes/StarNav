import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from 'jsonwebtoken'
import { JWT_SECRET } from '../config/index.js'
import { accountService } from '../services/identity/accountService.js'
import { sessionService } from '../services/identity/sessionService.js'
import { logger } from '../utils/logger.js'
import { buildErrorBody } from '../utils/response.js'
import { USER_LEVEL } from '../../shared/constants.js'
import {
  clearAuthCookieHeader,
  readAuthCookie,
  shouldUseSecureAuthCookie
} from '../utils/authCookie.js'
import { validateTrustedWriteOrigin } from '../utils/requestOrigin.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export interface AuthTokenPayload extends JwtPayload {
  username?: string
  sessionId?: string
  authVersion?: number
  source?: string
}

export interface AuthenticatedUser {
  username: string
  level: number
  authVersion: number
  sessionId?: string
  source?: string
}

type AuthRequest = Request & {
  user?: AuthenticatedUser
  authToken?: string
  authTokenSource?: 'bearer' | 'cookie' | null
}

const verifyAuthToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, JWT_SECRET)
  if (typeof decoded === 'string') {
    return { username: decoded }
  }
  return decoded as AuthTokenPayload
}

const sendUnauthorized = (
  req: AuthRequest,
  res: Response,
  message: string,
  code = 'UNAUTHORIZED',
  { clearCookie = false }: { clearCookie?: boolean } = {}
) => {
  const response = res.status(401)

  if (clearCookie) {
    response.set(
      'Set-Cookie',
      clearAuthCookieHeader({
        secure: shouldUseSecureAuthCookie(req)
      })
    )
  }

  return response.json(buildErrorBody(message, code))
}

const sendForbidden = (res: Response, message: string, code = 'FORBIDDEN') =>
  res.status(403).json(buildErrorBody(message, code))

const resolveAuthenticatedUser = (decoded: AuthTokenPayload) => {
  const currentUser = accountService.findByUsername(String(decoded.username || ''))
  if (!currentUser) {
    return {
      user: null,
      code: 'ACCOUNT_NOT_FOUND',
      message: '登录状态已失效，请重新登录'
    }
  }

  if (Number(decoded.authVersion || 0) !== Number(currentUser.authVersion || 0)) {
    return {
      user: null,
      code: 'TOKEN_REVOKED',
      message: '登录状态已失效，请重新登录'
    }
  }

  return {
    user: {
      username: currentUser.username,
      level: currentUser.level,
      authVersion: Number(currentUser.authVersion || 0),
      ...(decoded.sessionId ? { sessionId: decoded.sessionId } : {}),
      ...(decoded.source ? { source: decoded.source } : {})
    },
    code: null,
    message: null
  }
}

const ensureTrustedCookieWriteOrigin = (req: AuthRequest, res: Response) => {
  const method = String(req.method || 'GET').toUpperCase()
  if (req.authTokenSource !== 'cookie' || SAFE_METHODS.has(method)) {
    return true
  }

  const originCheck = validateTrustedWriteOrigin(req)
  if (originCheck.trusted) {
    return true
  }

  logger.warn('Cookie 写请求来源校验失败', {
    path: req.path,
    method,
    source: originCheck.source,
    origin: originCheck.origin
  })

  sendForbidden(res, '请求来源无效', 'INVALID_REQUEST_ORIGIN')
  return false
}

const resolveAuthToken = (req: AuthRequest) => {
  const authHeader = req.headers.authorization
  const bearerToken = authHeader && authHeader.split(' ')[1]

  if (bearerToken) {
    return {
      token: bearerToken,
      source: 'bearer' as const
    }
  }

  const cookieToken = readAuthCookie(req.headers.cookie)
  if (cookieToken) {
    return {
      token: cookieToken,
      source: 'cookie' as const
    }
  }

  return {
    token: null as string | null,
    source: null as 'bearer' | 'cookie' | null
  }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const { token, source } = resolveAuthToken(req)

  if (!token) {
    logger.warn('未授权访问尝试', { path: req.path })
    return sendUnauthorized(req, res, '未授权')
  }

  try {
    const decoded = verifyAuthToken(token)

    if (decoded.sessionId && !sessionService.validate(decoded.sessionId)) {
      logger.warn('会话已失效', { username: decoded.username, sessionId: decoded.sessionId })
      return sendUnauthorized(req, res, '会话已失效', 'SESSION_INVALID', {
        clearCookie: source === 'cookie'
      })
    }

    const resolvedUser = resolveAuthenticatedUser(decoded)
    if (!resolvedUser.user) {
      logger.warn('用户认证上下文已失效', {
        username: decoded.username,
        code: resolvedUser.code
      })
      return sendUnauthorized(req, res, resolvedUser.message, resolvedUser.code, {
        clearCookie: source === 'cookie'
      })
    }

    req.user = resolvedUser.user
    req.authToken = token
    req.authTokenSource = source

    if (!ensureTrustedCookieWriteOrigin(req, res)) {
      return
    }

    next()
  } catch (err: unknown) {
    const jwtErr = err as { name?: string; message?: string; expiredAt?: unknown }
    if (jwtErr?.name === 'TokenExpiredError') {
      logger.warn('令牌已过期', { expiredAt: jwtErr.expiredAt })
      return sendUnauthorized(req, res, '令牌已过期', 'TOKEN_EXPIRED', {
        clearCookie: source === 'cookie'
      })
    }
    logger.error('无效令牌', { error: jwtErr?.message })
    return sendUnauthorized(req, res, '无效令牌', 'INVALID_TOKEN', {
      clearCookie: source === 'cookie'
    })
  }
}

/**
 * 可选认证中间件
 * 如果有有效 token 则解析用户信息，否则跳过（允许游客访问）
 */
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const { token, source } = resolveAuthToken(req)

  if (token) {
    try {
      const decoded = verifyAuthToken(token)

      if (!decoded.sessionId || sessionService.validate(decoded.sessionId)) {
        const resolvedUser = resolveAuthenticatedUser(decoded)
        if (resolvedUser.user) {
          req.user = resolvedUser.user
          req.authToken = token
          req.authTokenSource = source
        } else {
          logger.warn('可选认证: 用户认证上下文已失效，按游客处理', {
            username: decoded.username,
            code: resolvedUser.code
          })
          if (source === 'cookie') {
            res.set(
              'Set-Cookie',
              clearAuthCookieHeader({
                secure: shouldUseSecureAuthCookie(req)
              })
            )
          }
        }
      } else {
        logger.warn('可选认证: 会话已失效，按游客处理', {
          username: decoded.username,
          sessionId: decoded.sessionId
        })
        if (source === 'cookie') {
          res.set(
            'Set-Cookie',
            clearAuthCookieHeader({
              secure: shouldUseSecureAuthCookie(req)
            })
          )
        }
      }
    } catch (err: unknown) {
      // Token 无效，当作游客处理
      const jwtErr = err as { message?: string }
      logger.warn('可选认证: token 无效，按游客处理', { error: jwtErr?.message })
      if (source === 'cookie') {
        res.set(
          'Set-Cookie',
          clearAuthCookieHeader({
            secure: shouldUseSecureAuthCookie(req)
          })
        )
      }
    }
  }
  next()
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.level < USER_LEVEL.ADMIN) {
    return sendForbidden(res, '权限不足')
  }
  next()
}
