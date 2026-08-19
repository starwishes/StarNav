import jwt from 'jsonwebtoken'

import { accountService } from './accountService.js'
import { sessionService } from './sessionService.js'
import { JWT_SECRET } from '../../config/index.js'
import { strongPasswordSchema } from '../../middleware/validation.js'
import { errors } from '../../middleware/errorHandler.js'
import type { AuthCredentials, AuthUserLike } from '../../types/domain.js'

const TOKEN_EXPIRES_IN = '7d'

export const buildAuthUser = (user: AuthUserLike) => ({
  login: user.username,
  name: user.username,
  level: user.level
})

export const issueToken = (user: AuthUserLike, sessionId?: string | null) => {
  return jwt.sign(
    {
      username: user.username,
      level: user.level,
      authVersion: Number(user.authVersion || 0),
      ...(sessionId ? { sessionId } : {})
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
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

export const syncRenamedSessions = (oldUsername: string, newUsername?: string | null) => {
  if (newUsername && newUsername !== oldUsername) {
    sessionService.renameUsername(oldUsername, newUsername)
  }
}
