import bcrypt from 'bcryptjs'
import type { AuthCredentials, AuthUserLike, RequestContextLike } from '../../types/domain.js'

import { accountService } from './accountService.js'
import { auditService } from './auditService.js'
import { sessionService } from './sessionService.js'
import { settingsService } from '../system/settingsService.js'
import {
  buildAuthUser,
  ensureStrongPassword,
  issueToken,
  DEFAULT_SESSION_DAYS,
  REMEMBER_SESSION_DAYS,
  sessionDaysToExpiresIn
} from './identityHelpers.js'
import { loginSchema } from '../../validation.js'
import { errors } from '../../utils/errors.js'
import { logger } from '../../utils/logger.js'

/**
 * 用户不存在时也执行一次 bcrypt 比较，抹平"存在/不存在"的响应时间差，
 * 避免通过登录接口对用户名做时序枚举。
 *
 * cost 必须与 accountService.BCRYPT_COST（当前 12）保持一致：若两者 cost 不同，
 * "用户不存在"路径的耗时与"存在但密码错误"路径错开，时序抹平会失效。
 * 维护时：改动 BCRYPT_COST 后需用 bcrypt.hashSync 重新生成同等 cost 的哈希替换此处。
 */
export const DUMMY_PASSWORD_HASH = '$2b$12$xxlG2kknrDYoFN4cJIMZnuwQKSwBDG1dUhYD8GUV/xRMTitci1oNm'

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

    if (!user) {
      // 执行一次无意义比较，保持与"用户存在但密码错误"相同的时间开销
      bcrypt.compareSync(password, DUMMY_PASSWORD_HASH)
      auditService.log('login', { username, ip, userAgent, success: false })
      logger.warn(`登录失败尝试: ${username}`, { ip })
      throw errors.unauthorized('用户名或密码错误')
    }

    if (!bcrypt.compareSync(password, user.password)) {
      auditService.log('login', { username, ip, userAgent, success: false })
      logger.warn(`登录失败尝试: ${username}`, { ip })
      throw errors.unauthorized('用户名或密码错误')
    }

    const remember = credentials.remember === true
    const expiresInDays = remember ? REMEMBER_SESSION_DAYS : DEFAULT_SESSION_DAYS
    const sessionId = sessionService.create(user.username, ip, userAgent, { expiresInDays })
    accountService.updateLastLogin(user.username)
    const token = issueToken(user, { expiresIn: sessionDaysToExpiresIn(expiresInDays) }, sessionId)

    auditService.log('login', { username: user.username, ip, userAgent, success: true })
    logger.info(`用户登录成功: ${user.username} (remember=${remember}, ${expiresInDays}d)`)

    return {
      token,
      user: buildAuthUser(user),
      sessionId,
      expiresInDays
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
