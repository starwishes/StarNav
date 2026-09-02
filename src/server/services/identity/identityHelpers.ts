import jwt from 'jsonwebtoken'

import { accountService } from './accountService.js'
import { JWT_SECRET } from '../../config/index.js'
import { strongPasswordSchema } from '../../validation.js'
import { errors } from '../../utils/errors.js'
import type { AuthCredentials, AuthUserLike } from '../../types/domain.js'

const TOKEN_EXPIRES_IN = '7d'

// 会话有效期（天）：默认 30 天，勾选"记住我"后延长到 90 天。
// 同时作用于 JWT 过期、HttpOnly Cookie maxAge、数据库 sessions.expires_at。
export const DEFAULT_SESSION_DAYS = 30
export const REMEMBER_SESSION_DAYS = 90
export const sessionDaysToExpiresIn = (days: number) => `${Math.max(1, days)}d`

export const buildAuthUser = (user: AuthUserLike) => ({
  login: user.username,
  name: user.username,
  level: user.level
})

export const issueToken = (
  user: AuthUserLike,
  sessionId?: string | null,
  options: { expiresIn?: string | number } = {}
) => {
  return jwt.sign(
    {
      username: user.username,
      level: user.level,
      authVersion: Number(user.authVersion || 0),
      ...(sessionId ? { sessionId } : {})
    },
    JWT_SECRET,
    { expiresIn: (options.expiresIn ?? TOKEN_EXPIRES_IN) as jwt.SignOptions['expiresIn'] }
  )
}

export const ensureStrongPassword = (payload: AuthCredentials | Record<string, unknown>) => {
  const { error } = strongPasswordSchema.validate(payload)
  if (error) {
    throw errors.badRequest(error.details[0].message)
  }
}

export const ensureExistingUser = (username: string) => {
  const user = accountService.findByUsername(username)
  if (!user) {
    throw errors.notFound('用户不存在')
  }

  return user
}
