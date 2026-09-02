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
