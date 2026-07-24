import bcrypt from 'bcryptjs'
import type { AuthCredentials, AuthUserLike, RequestContextLike } from '../../types/domain.js'

import { accountService } from './accountService.js'
import { auditService } from './auditService.js'
import { sessionService } from './sessionService.js'
import { settingsService } from '../system/settingsService.js'
import { buildAuthUser, ensureStrongPassword, issueToken } from './identityHelpers.js'
import { loginSchema } from '../../middleware/validation.js'
import { errors } from '../../middleware/errorHandler.js'
import { logger } from '../../utils/logger.js'

export const authLifecycleService = {
  login(credentials: AuthCredentials, context: RequestContextLike = {}) {
    const { error } = loginSchema.validate(credentials)
    if (error) {
      throw errors.badRequest('输入格式不正确')
    }

    const username = String(credentials.username || '')
    const password = String(credentials.password || '')
    const ip = context.ip || 'unknown'
    const userAgent = context.userAgent || 'unknown'
    const user = accountService.findByUsername(username)

    if (!user || !bcrypt.compareSync(password, user.password)) {
      auditService.log('login', { username, ip, userAgent, success: false })
      logger.warn(`登录失败尝试: ${username}`)
      throw errors.unauthorized('用户名或密码错误')
    }

    const sessionId = sessionService.create(user.username, ip, userAgent)
    accountService.updateLastLogin(user.username)
    const token = issueToken(user, sessionId)

    auditService.log('login', { username: user.username, ip, userAgent, success: true })
    logger.info(`用户登录成功: ${user.username}`)

    return {
      token,
      user: buildAuthUser(user),
      sessionId
    }
  },

  logout(user?: AuthUserLike | null, context: RequestContextLike = {}) {
    if (user?.sessionId) {
      sessionService.revoke(user.sessionId)
      auditService.log('logout', {
        username: user.username,
        ip: context.ip || 'unknown'
      })
    }

    return undefined
  },

  register(credentials: AuthCredentials, context: RequestContextLike = {}) {
    if (!settingsService.get('registrationEnabled', false)) {
      throw errors.forbidden('注册功能已关闭')
    }

    ensureStrongPassword(credentials)

    const username = String(credentials.username || '')
    const password = String(credentials.password || '')
    if (accountService.findByUsername(username)) {
      throw errors.badRequest('该用户名已被注册')
    }

    const createdUser = accountService.create(username, password)
    if (!createdUser) {
      throw errors.internal('注册失败')
    }

    auditService.log('register', { username, ip: context.ip || 'unknown' })
    logger.info(`新用户注册: ${username}`)

    return undefined
  }
}
