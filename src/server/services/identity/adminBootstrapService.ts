import fs from 'fs'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

import { getDb } from '../database/database.js'
import { ADMIN_BOOTSTRAP_PASSWORD_PATH, DATA_DIR, DEFAULT_ADMIN_NAME } from '../../config/index.js'
import { logger } from '../../utils/logger.js'
import type { UserTableRow } from '../../types/sqliteRows.js'

const RANDOM_PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const DEFAULT_BOOTSTRAP_PASSWORD_TTL_HOURS = 24
const DEFAULT_BOOTSTRAP_PASSWORD_DELIVERY = 'file'
const BOOTSTRAP_PASSWORD_DELIVERY_MODES = new Set(['file', 'log', 'both'])

const getBootstrapPasswordTtlMs = () => {
  const configured = Number.parseInt(process.env.ADMIN_BOOTSTRAP_PASSWORD_TTL_HOURS || '', 10)
  const ttlHours =
    Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_BOOTSTRAP_PASSWORD_TTL_HOURS
  return ttlHours * 60 * 60 * 1000
}

const createRandomPassword = (length = 12) => {
  // 使用 CSPRNG (crypto.randomInt) 而非 Math.random，凭据类随机数不可预测
  let password = ''
  for (let i = 0; i < length; i++) {
    password += RANDOM_PASSWORD_CHARS.charAt(crypto.randomInt(RANDOM_PASSWORD_CHARS.length))
  }
  return password
}

const getBootstrapPasswordDeliveryMode = () => {
  const configured = (process.env.ADMIN_BOOTSTRAP_PASSWORD_DELIVERY || '').trim().toLowerCase()
  return BOOTSTRAP_PASSWORD_DELIVERY_MODES.has(configured)
    ? configured
    : DEFAULT_BOOTSTRAP_PASSWORD_DELIVERY
}

const shouldWriteBootstrapPasswordFile = (deliveryMode: string) =>
  deliveryMode === 'file' || deliveryMode === 'both'

const shouldLogBootstrapPassword = (deliveryMode: string) =>
  deliveryMode === 'log' || deliveryMode === 'both'

const persistBootstrapPassword = (username: string, password: string) => {
  const contents = [
    `username=${username}`,
    `password=${password}`,
    `generated_at=${new Date().toISOString()}`,
    ''
  ].join('\n')

  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(ADMIN_BOOTSTRAP_PASSWORD_PATH, contents, { mode: 0o600 })
}

const readBootstrapPasswordRecord = () => {
  if (!fs.existsSync(ADMIN_BOOTSTRAP_PASSWORD_PATH)) {
    return null
  }

  try {
    const raw = fs.readFileSync(ADMIN_BOOTSTRAP_PASSWORD_PATH, 'utf8')
    const entries = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/=(.*)/s))

    return Object.fromEntries(entries)
  } catch (error) {
    logger.error('读取管理员初始密码文件失败', error)
    return null
  }
}

export const clearBootstrapPasswordFile = () => {
  if (fs.existsSync(ADMIN_BOOTSTRAP_PASSWORD_PATH)) {
    fs.rmSync(ADMIN_BOOTSTRAP_PASSWORD_PATH, { force: true })
  }
}

const normalizeBootstrapPasswordRecord = (record: Record<string, string> | null) => {
  if (!record?.username || !record?.password) {
    return null
  }

  const generatedAtMs = Date.parse(record.generated_at || '')
  if (!Number.isFinite(generatedAtMs)) {
    return null
  }

  const expiresAtMs = generatedAtMs + getBootstrapPasswordTtlMs()

  return {
    username: record.username,
    password: record.password,
    generatedAt: new Date(generatedAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    generatedAtMs,
    expiresAtMs
  }
}

export const consumeBootstrapPasswordFile = () => {
  const normalized = normalizeBootstrapPasswordRecord(readBootstrapPasswordRecord())
  if (!normalized) {
    clearBootstrapPasswordFile()
    return null
  }

  if (Date.now() > normalized.expiresAtMs) {
    clearBootstrapPasswordFile()
    return null
  }

  clearBootstrapPasswordFile()

  return {
    username: normalized.username,
    password: normalized.password,
    generatedAt: normalized.generatedAt,
    expiresAt: normalized.expiresAt
  }
}

const clearBootstrapPasswordFileIfStale = (
  adminUsername: string,
  adminUser: { password?: string } | null
) => {
  const normalized = normalizeBootstrapPasswordRecord(readBootstrapPasswordRecord())
  if (!normalized) {
    clearBootstrapPasswordFile()
    return
  }

  if (Date.now() > normalized.expiresAtMs) {
    clearBootstrapPasswordFile()
    return
  }

  if (normalized.username !== adminUsername || !adminUser) {
    clearBootstrapPasswordFile()
    return
  }

  if (!adminUser.password || !bcrypt.compareSync(normalized.password, adminUser.password)) {
    clearBootstrapPasswordFile()
  }
}

const announceBootstrapPassword = (username: string, password: string, deliveryMode: string) => {
  logger.warn('⚠️  检测到默认密码 "admin123"')

  if (shouldWriteBootstrapPasswordFile(deliveryMode)) {
    logger.warn('出于安全考虑，系统已生成随机密码并写入受限文件')
  }

  if (shouldLogBootstrapPassword(deliveryMode)) {
    logger.warn('已按 ADMIN_BOOTSTRAP_PASSWORD_DELIVERY 配置将初始密码输出到启动日志')
  }

  logger.warn(`管理员账户: ${username}`)

  if (shouldWriteBootstrapPasswordFile(deliveryMode)) {
    logger.warn(`密码文件: ${ADMIN_BOOTSTRAP_PASSWORD_PATH}`)
  }

  if (shouldLogBootstrapPassword(deliveryMode)) {
    logger.warn(`初始密码: ${password}`)
  }

  if (deliveryMode === 'both') {
    logger.warn('请使用日志或受限文件中的一次性密码登录，并立即修改密码。')
    return
  }

  if (deliveryMode === 'file') {
    logger.warn('请立即读取该文件、登录并修改密码，然后删除该文件。')
    return
  }

  logger.warn('请立即使用该密码登录并修改密码；如不再需要，请改为显式设置 ADMIN_PASSWORD。')
}

export const adminBootstrapService = {
  initAdminAccount() {
    const db = getDb()
    const adminUsername = DEFAULT_ADMIN_NAME
    const rawAdminPassword = process.env.ADMIN_PASSWORD

    const adminUser = db
      .prepare<UserTableRow>('SELECT * FROM users WHERE username = ?')
      .get(adminUsername)

    let shouldReset = false
    let isDefault = false
    let isNew = false

    if (!adminUser) {
      isNew = true
      shouldReset = true
    }

    const isTestEnv = process.env.NODE_ENV === 'test'

    if (rawAdminPassword === 'admin123' && process.env.NODE_ENV === 'production') {
      shouldReset = true
      isDefault = true
    }

    if (
      !shouldReset &&
      process.env.NODE_ENV === 'production' &&
      adminUser &&
      bcrypt.compareSync('admin123', adminUser.password)
    ) {
      shouldReset = true
      isDefault = true
    }

    if (shouldReset) {
      let finalPassword = rawAdminPassword
      let isRandom = false

      if (!finalPassword && !isTestEnv) {
        finalPassword = createRandomPassword()
        isRandom = true
      } else if (
        (isDefault || finalPassword === 'admin123') &&
        process.env.NODE_ENV === 'production'
      ) {
        finalPassword = createRandomPassword()
        isRandom = true
      } else if (isTestEnv && !finalPassword) {
        finalPassword = 'admin123'
      }

      const deliveryMode = getBootstrapPasswordDeliveryMode()
      const hashed = bcrypt.hashSync(finalPassword || 'admin123', 10)

      if (isNew) {
        db.prepare(
          `
                    INSERT INTO users(username, password, level, auth_version, created_at)
VALUES(?, ?, 3, 0, datetime('now'))
                `
        ).run(adminUsername, hashed)
        logger.info(`管理员账户[${adminUsername}]初始化成功`)
      } else {
        db.prepare(
          'UPDATE users SET password = ?, auth_version = COALESCE(auth_version, 0) + 1 WHERE username = ?'
        ).run(hashed, adminUsername)
        logger.warn(
          `安全预警：检测到管理员账户[${adminUsername}]使用危险默认密码，系统已执行强制重置`
        )
      }

      if (isRandom) {
        const deliveredPassword = String(finalPassword || '')
        if (shouldWriteBootstrapPasswordFile(deliveryMode)) {
          persistBootstrapPassword(adminUsername, deliveredPassword)
        } else {
          clearBootstrapPasswordFile()
        }

        announceBootstrapPassword(adminUsername, deliveredPassword, deliveryMode)
      } else {
        clearBootstrapPasswordFile()
      }

      return
    }

    // shouldReset path covers missing admin; remaining checks require an existing row
    if (!adminUser) {
      return
    }

    if (rawAdminPassword && !bcrypt.compareSync(rawAdminPassword, adminUser.password)) {
      const hashed = bcrypt.hashSync(rawAdminPassword, 10)
      db.prepare(
        'UPDATE users SET password = ?, auth_version = COALESCE(auth_version, 0) + 1 WHERE username = ?'
      ).run(hashed, adminUsername)
      clearBootstrapPasswordFile()
      logger.info(`管理员账户[${adminUsername}]密码已通过环境变量成功强制更新`)
      return
    }

    if (adminUser.level < 3) {
      db.prepare(
        'UPDATE users SET level = 3, auth_version = COALESCE(auth_version, 0) + 1 WHERE username = ?'
      ).run(adminUsername)
      logger.warn(`管理员账户[${adminUsername}]权限等级已自动修复(0 -> 3)`)
    }

    clearBootstrapPasswordFileIfStale(adminUsername, adminUser)
    logger.info(`管理员账户[${adminUsername}]验证状态：OK`)
  }
}
