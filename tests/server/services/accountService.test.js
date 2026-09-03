// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { accountService } from '../../../src/server/services/identity/accountService.js'
import { getDb } from '../../../src/server/services/database/database.js'
import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'

describe('AccountService', () => {
  let testDataDir

  beforeEach(() => {
    testDataDir = createTestDataDir('starnav-account-service-test')
    const db = getDb()
    db.prepare('DELETE FROM users WHERE username LIKE ?').run('test%')
  })

  afterEach(async () => {
    await cleanupTestDataDir(testDataDir)
  })

  describe('create', () => {
    it('should create a new user with hashed password', () => {
      const result = accountService.create('testuser1', 'password123', 1)

      expect(result).toBeTruthy()
      expect(result.username).toBe('testuser1')
      expect(result.password).toBeTruthy() // password 会被返回，但已哈希
      // 第 16 轮审查：cost 固定 12（旧哈希登录验证读取 hash 内 cost，不受影响）
      expect(bcrypt.getRounds(result.password)).toBe(12)
    })

    it('should reject duplicate username', () => {
      accountService.create('testuser2', 'password123', 1)
      const result = accountService.create('testuser2', 'different', 1)

      expect(result).toBeNull()
    })

    it('should create user with any password length', () => {
      const result = accountService.create('testuser3', '123', 1)
      // 服务层不验证密码长度，控制器层负责验证
      expect(result).toBeTruthy()
    })
  })

  describe('getAll', () => {
    it('orders mixed space-form and T-form rows by real time, not string order', () => {
      const db = getDb()
      const insert = db.prepare(
        'INSERT INTO users (username, password, level, auth_version, created_at) VALUES (?, ?, ?, 0, ?)'
      )

      // 同日混存两种格式时，字符串倒序恒把 T 形（'T' > ' '）排前面：space-noon 真实更晚
      // 却被排在 t-morning 之后。数值比较必须按真实时间倒序返回 space-noon 在前。
      insert.run('t-morning', 'x', 1, '2026-04-13T09:00:00.000Z')
      insert.run('space-noon', 'x', 1, '2026-04-13 12:00:00')
      insert.run('next-day', 'x', 1, '2026-04-14T00:00:00.000Z')

      const users = accountService.getAll()

      expect(users.map((row) => row.username)).toEqual(['next-day', 'space-noon', 't-morning'])
    })

    it('keeps same-second rows in a stable order via username tiebreak', () => {
      const db = getDb()
      const insert = db.prepare(
        'INSERT INTO users (username, password, level, auth_version, created_at) VALUES (?, ?, ?, 0, ?)'
      )

      insert.run('zeta', 'x', 1, '2026-04-13T10:00:00.000Z')
      insert.run('alpha', 'x', 1, '2026-04-13 10:00:00')
      insert.run('mid', 'x', 1, '2026-04-13T10:00:00.000Z')

      const users = accountService.getAll()

      // strftime('%s') 同秒相等时以 username 升序决胜，顺序确定
      expect(users.map((row) => row.username)).toEqual(['alpha', 'mid', 'zeta'])
    })
  })

  describe('verifyPassword', () => {
    beforeEach(() => {
      accountService.create('testuser4', 'correct123', 1)
    })

    it('should validate correct credentials', () => {
      const result = accountService.verifyPassword('testuser4', 'correct123')
      expect(result).toBeTruthy()
    })

    it('should reject incorrect password', () => {
      const result = accountService.verifyPassword('testuser4', 'wrong')
      expect(result).toBeFalsy()
    })

    it('should reject non-existent user', () => {
      const result = accountService.verifyPassword('nonexistent', 'password')
      expect(result).toBeFalsy()
    })
  })

  describe('findByUsername', () => {
    beforeEach(() => {
      accountService.create('testuser5', 'password123', 1)
    })

    it('should retrieve user by username', () => {
      const user = accountService.findByUsername('testuser5')
      expect(user).toBeTruthy()
      expect(user.username).toBe('testuser5')
    })

    it('should return null for non-existent user', () => {
      const user = accountService.findByUsername('nonexistent')
      expect(user).toBeNull()
    })
  })

  describe('update', () => {
    beforeEach(() => {
      accountService.create('testuser6', 'oldpass', 1)
    })

    it('should update user password', () => {
      const result = accountService.update('testuser6', { password: 'newpass' })
      expect(result).toBeTruthy()

      // 验证新密码
      const isValid = accountService.verifyPassword('testuser6', 'newpass')
      expect(isValid).toBeTruthy()
      // 更新后的密码同样以 cost 12 重哈希
      expect(bcrypt.getRounds(result.password)).toBe(12)
    })

    it('should reject update for non-existent user', () => {
      const result = accountService.update('nonexistent', { password: 'newpass' })
      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    beforeEach(() => {
      accountService.create('testuser7', 'password123', 1)
    })

    it('should delete existing user', () => {
      const result = accountService.delete('testuser7')
      expect(result).toBeTruthy()

      const user = accountService.findByUsername('testuser7')
      expect(user).toBeNull()
    })

    it('should return false when deleting non-existent user', () => {
      const result = accountService.delete('nonexistent')
      expect(result).toBeFalsy()
    })
  })
})
