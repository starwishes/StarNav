import { DEFAULT_ADMIN_NAME } from '../../config/index.js'
import { accountService } from './accountService.js'
import { clearBootstrapPasswordFile } from './adminBootstrapService.js'
import { auditService } from './auditService.js'
import { sessionService } from './sessionService.js'
import { ensureExistingUser, ensureStrongPassword } from './identityHelpers.js'
import { errors } from '../../middleware/errorHandler.js'
import type { AuthCredentials, PaginationQuery, RequestContextLike } from '../../types/domain.js'
export const adminIdentityService = {
  getAuditLogs(query: PaginationQuery = {}) {
    const page = Number.parseInt(String(query.page ?? ''), 10) || 1
    const limit = Number.parseInt(String(query.limit ?? ''), 10) || 50

    return auditService.getLogs(page, limit)
  },

  clearAuditLogs() {
    if (!auditService.clear()) {
      throw errors.internal('清空失败')
    }

    return undefined
  },

  getUsers() {
    return accountService.getAll()
  },

  createUser(payload: AuthCredentials & { level?: number }) {
    ensureStrongPassword(payload)

    const username = String(payload.username || '')
    const password = String(payload.password || '')
    const level = payload.level
    if (accountService.findByUsername(username)) {
      throw errors.badRequest('用户已存在')
    }

    const createdUser = accountService.create(username, password, level)
    if (!createdUser) {
      throw errors.internal('创建用户失败')
    }

    return undefined
  },

  updateUser(targetUsername: string, updates: { newUsername?: string; password?: string; level?: number }, context: RequestContextLike = {}) {
    ensureExistingUser(targetUsername)

    const { newUsername, password, level } = updates
    if (password) {
      ensureStrongPassword({
        username: newUsername || targetUsername,
        password,
        level
      })
    }

    const result = accountService.update(targetUsername, { newUsername, password, level })
    if (!result) {
      throw errors.internal('更新失败')
    }
    if ('error' in result) {
      throw errors.badRequest(result.error)
    }

    if (password || level !== undefined || (newUsername && newUsername !== targetUsername)) {
      sessionService.revokeByUsername(targetUsername)
      if (result.username !== targetUsername) {
        sessionService.revokeByUsername(result.username)
      }
    }

    if (
      (targetUsername === DEFAULT_ADMIN_NAME || result.username === DEFAULT_ADMIN_NAME) &&
      (password || (newUsername && newUsername !== targetUsername))
    ) {
      clearBootstrapPasswordFile()
    }

    auditService.log('admin_update_user', {
      username: context.operator || 'anonymous',
      ip: context.ip || 'unknown',
      userAgent: context.userAgent || 'unknown',
      details: `Updated user: ${targetUsername} -> ${result.username}`
    })

    return {
      user: {
        username: result.username,
        level: result.level
      }
    }
  },

  deleteUser(targetUsername: string, context: RequestContextLike = {}) {
    ensureExistingUser(targetUsername)
    sessionService.revokeByUsername(targetUsername)

    if (!accountService.delete(targetUsername)) {
      throw errors.notFound('用户不存在')
    }

    auditService.log('admin_delete_user', {
      username: context.operator || 'anonymous',
      ip: context.ip || 'unknown',
      userAgent: context.userAgent || 'unknown',
      details: `Deleted user: ${targetUsername}`
    })

    return undefined
  }
}
