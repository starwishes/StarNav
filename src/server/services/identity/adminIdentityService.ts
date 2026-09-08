import { DEFAULT_ADMIN_NAME } from '../../config/index.js'
import { accountService } from './accountService.js'
import { clearBootstrapPasswordFile } from './adminBootstrapService.js'
import { auditService } from './auditService.js'
import { sessionService } from './sessionService.js'
import { ensureExistingUser, ensureStrongPassword } from './identityHelpers.js'
import { errors } from '../../utils/errors.js'
import { USER_LEVEL } from '../../../shared/constants.js'
import { adminUpdateUserSchema } from '../../validation.js'
import type {
  AuditClearQuery,
  AuthCredentials,
  PaginationQuery,
  RequestContextLike
} from '../../types/domain.js'

// 与前端构造的 UTC 时间格式保持一致（audit_logs.created_at 以 strftime('%Y-%m-%dT%H:%M:%fZ','now') 存储）
const AUDIT_BEFORE_RE = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/

const isRealDate = (str: string): boolean => {
  const [datePart, timePart] = str.split(' ')
  const [y, m, d] = datePart.split('-').map(Number)
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false
  if (timePart) {
    const [h, min, s] = timePart.split(':').map(Number)
    if (h > 23 || min > 59 || s > 59) return false
  }
  return true
}

const normalizeBeforeDate = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  const str = String(value)
  if (!AUDIT_BEFORE_RE.test(str) || !isRealDate(str)) {
    throw errors.badRequest('无效的 before 参数，应为 YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS')
  }
  return str
}

export const adminIdentityService = {
  getAuditLogs(query: PaginationQuery = {}) {
    const parsedPage = Number.parseInt(String(query.page ?? ''), 10)
    const parsedLimit = Number.parseInt(String(query.limit ?? ''), 10)

    // page 钳上限：超大 offset 会让 SQLite 做无谓的全表跳过扫描（第 28 轮盲审 L3）
    const page = Number.isNaN(parsedPage) ? 1 : Math.min(10000, Math.max(1, parsedPage))
    const limit = Number.isNaN(parsedLimit) ? 50 : Math.min(200, Math.max(1, parsedLimit))

    return auditService.getLogs(page, limit)
  },

  clearAuditLogs(query: AuditClearQuery = {}) {
    const before = normalizeBeforeDate('before' in query ? query.before : undefined)

    if (!auditService.clear(before)) {
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

  updateUser(
    targetUsername: string,
    updates: { newUsername?: string; password?: string; level?: number },
    context: RequestContextLike = {}
  ) {
    ensureExistingUser(targetUsername)

    // 无 password 时也必须校验：level 任意类型原样入库曾让非数值绕过 requireAdmin
    // 数值比较、newUsername 任意字符可把账号改砖（第 27 轮盲审 M1）
    const { error, value } = adminUpdateUserSchema.validate(updates)
    if (error) {
      throw errors.badRequest(error.details[0].message)
    }

    const { newUsername, password, level } = value as {
      newUsername?: string
      password?: string
      level?: number
    }

    const isMaster = targetUsername === DEFAULT_ADMIN_NAME
    if (isMaster && newUsername && newUsername !== targetUsername) {
      throw errors.badRequest('不能重命名主管理员账户')
    }
    if (isMaster && level !== undefined && Number(level) < USER_LEVEL.ADMIN) {
      throw errors.badRequest('不能将主管理员降级为非管理员')
    }
    // 自降级守卫（与 deleteUser 的"不能删除自己"对称，第 30 轮盲审 M1）：
    // 非主管理员对自己降级会立即撤销全部会话并失去管理权，若站内无其他管理员即锁死
    if (
      context.operator &&
      targetUsername === context.operator &&
      level !== undefined &&
      Number(level) < USER_LEVEL.ADMIN
    ) {
      throw errors.badRequest('不能降级当前登录的管理员账户')
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

    if (targetUsername === DEFAULT_ADMIN_NAME) {
      throw errors.badRequest('不能删除主管理员账户')
    }

    if (context.operator && targetUsername === context.operator) {
      throw errors.badRequest('不能删除当前登录账户')
    }

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
