import bcrypt from 'bcryptjs'
import { getDb } from '../database/database.js'
import { logger } from '../../utils/logger.js'
import { USER_LEVEL } from '../../../shared/constants.js'
import type { UserListRow, UserRow, SettingsValueRow } from '../../types/sqliteRows.js'

/**
 * 账户管理服务 (SQLite 版本)
 */
class AccountService {
  /**
   * 获取所有用户（不含密码）
   */
  getAll(): UserListRow[] {
    const db = getDb()
    return db
      .prepare<UserListRow>(
        `
            SELECT username, level, created_at as createdAt, last_login as lastLogin
            FROM users
            ORDER BY created_at DESC
        `
      )
      .all()
  }

  /**
   * 根据用户名查找用户
   */
  findByUsername(username: string): UserRow | null {
    const db = getDb()
    const user = db
      .prepare<UserRow>(
        `
            SELECT username, password, level, auth_version as authVersion,
                   created_at as createdAt, last_login as lastLogin
            FROM users WHERE username = ?
        `
      )
      .get(username)
    return user || null
  }

  /**
   * 创建用户
   */
  create(username: string, password: string, level: number | undefined = undefined) {
    const db = getDb()
    const hashedPassword = bcrypt.hashSync(password, 10)

    // 获取默认用户级别
    const settingRow = db
      .prepare<SettingsValueRow>('SELECT value FROM settings WHERE key = ?')
      .get('defaultUserLevel')
    const defaultLevel = settingRow ? JSON.parse(settingRow.value) : USER_LEVEL.USER

    try {
      db.prepare(
        `
                INSERT INTO users (username, password, level, auth_version, created_at)
                VALUES (?, ?, ?, 0, datetime('now'))
            `
      ).run(username, hashedPassword, level || defaultLevel)

      logger.info(`用户创建成功: ${username}`)
      return this.findByUsername(username)
    } catch (err: unknown) {
      const sqliteErr = err as { code?: string }
      if (sqliteErr.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        logger.warn(`用户已存在: ${username}`)
        return null
      }
      logger.error('用户创建失败', err)
      return null
    }
  }

  /**
   * 更新用户
   */
  update(
    oldUsername: string,
    { newUsername, password, level }: { newUsername?: string; password?: string; level?: number }
  ): UserRow | { error: string } | null {
    const db = getDb()
    const user = this.findByUsername(oldUsername)
    if (!user) return null

    try {
      // 如果要改用户名，先检查新用户名是否存在
      if (newUsername && newUsername !== oldUsername) {
        if (this.findByUsername(newUsername)) {
          return { error: '用户名已占用' }
        }
      }

      // 构建更新语句
      const updates: string[] = []
      const params: unknown[] = []

      if (level !== undefined) {
        updates.push('level = ?')
        params.push(level)
      }
      if (password) {
        updates.push('password = ?')
        params.push(bcrypt.hashSync(password, 10))
      }
      if (newUsername && newUsername !== oldUsername) {
        updates.push('username = ?')
        params.push(newUsername)
      }

      if (password || level !== undefined || (newUsername && newUsername !== oldUsername)) {
        updates.push('auth_version = COALESCE(auth_version, 0) + 1')
      }

      if (updates.length > 0) {
        params.push(oldUsername)
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE username = ?`).run(...params)
      }

      logger.info(`用户更新成功: ${oldUsername}`)
      return this.findByUsername(newUsername || oldUsername)
    } catch (err: unknown) {
      logger.error('用户更新失败', err)
      return null
    }
  }

  /**
   * 删除用户
   */
  delete(username: string) {
    const db = getDb()

    try {
      const result = db.prepare('DELETE FROM users WHERE username = ?').run(username)
      if (result.changes > 0) {
        logger.info(`用户删除成功: ${username}`)
        return true
      }
      return false
    } catch (err: unknown) {
      logger.error('用户删除失败', err)
      return false
    }
  }

  /**
   * 更新最后登录时间
   */
  updateLastLogin(username: string) {
    const db = getDb()
    try {
      db.prepare(`UPDATE users SET last_login = datetime('now') WHERE username = ?`).run(username)
    } catch (err: unknown) {
      logger.error('更新登录时间失败', err)
    }
  }

  /**
   * 验证密码
   */
  verifyPassword(username: string, password: string) {
    const user = this.findByUsername(username)
    if (!user) return false
    return bcrypt.compareSync(password, user.password)
  }
}

export const accountService = new AccountService()
