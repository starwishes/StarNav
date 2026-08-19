import fs from 'fs'
import path from 'path'
import { getDb, forceCheckpoint } from './database/database.js'
import { DATA_DIR, getUserDataPath, DEFAULT_ADMIN_NAME } from '../config/index.js'
import { logger } from '../utils/logger.js'
import type { CountRow } from '../types/sqliteRows.js'

/**
 * 从 JSON 文件迁移数据到 SQLite
 * 在应用启动时调用，自动检测并迁移
 */
export const migrateFromJson = () => {
  const db = getDb()

  // 检查是否已有数据（避免重复迁移）
  const existingCategories =
    db.prepare<CountRow>('SELECT COUNT(*) as count FROM categories').get()?.count ?? 0
  if (existingCategories > 0) {
    logger.info('数据库已有数据，跳过迁移')
    return false
  }

  // 尝试找到 JSON 数据文件
  const jsonPaths = [path.join(DATA_DIR, 'data.json'), getUserDataPath(DEFAULT_ADMIN_NAME)]

  let jsonData: { categories?: unknown[]; items?: unknown[] } | null = null
  let sourceFile: string | null = null

  for (const jsonPath of jsonPaths) {
    if (fs.existsSync(jsonPath)) {
      try {
        const content = fs.readFileSync(jsonPath, 'utf8')
        jsonData = JSON.parse(content)
        sourceFile = jsonPath
        logger.info(`找到 JSON 数据文件: ${jsonPath}`)
        break
      } catch (err) {
        logger.warn(`解析 JSON 失败: ${jsonPath}`, err)
      }
    }
  }

  if (!jsonData) {
    logger.info('未找到需要迁移的 JSON 数据')
    return false
  }

  // 开始迁移
  logger.info('开始数据迁移: JSON → SQLite')

  const transaction = db.transaction(() => {
    // 迁移分类
    const categories = (jsonData.categories || []) as Array<Record<string, unknown>>
    const insertCategory = db.prepare(`
            INSERT OR REPLACE INTO categories (id, name, icon, level, sort_order)
            VALUES (?, ?, ?, ?, ?)
        `)

    categories.forEach((cat, index) => {
      insertCategory.run(
        Number(cat.id),
        cat.name || '',
        cat.icon || '',
        Number(cat.level || 0),
        index
      )
    })
    logger.info(`迁移分类: ${categories.length} 条`)

    // 合法分类 ID 集合：items.category_id 引用不存在的分类会触发外键约束
    // 使整个迁移事务失败，因此先收集有效 ID，悬空引用改为 NULL（未分类）
    const validCategoryIds = new Set(categories.map((cat) => Number(cat.id)))

    // 迁移书签
    const items = (jsonData.items || []) as Array<Record<string, unknown>>
    const insertItem = db.prepare(`
            INSERT OR REPLACE INTO items 
            (id, name, url, description, icon, category_id, pinned, level, click_count, last_visited, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

    items.forEach((item, index) => {
      const rawCategoryId = Number(item.categoryId)
      const categoryId = validCategoryIds.has(rawCategoryId) ? rawCategoryId : null

      insertItem.run(
        Number(item.id),
        item.name || '',
        item.url || '',
        item.description || '',
        item.icon || '',
        categoryId,
        item.pinned ? 1 : 0,
        Number(item.level || 0),
        Number(item.clickCount || 0),
        item.lastVisited || null,
        index
      )
    })
    logger.info(`迁移书签: ${items.length} 条`)
  })

  try {
    transaction()
    forceCheckpoint() // 迁移后立即同步磁盘

    // 备份并清理原 JSON 文件
    const backupDir = path.join(DATA_DIR, 'archive')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    const backupPath = path.join(backupDir, path.basename(sourceFile!) + '.migrated.bak')
    fs.renameSync(sourceFile!, backupPath)
    logger.info(`原 JSON 文件已迁移并归档: ${backupPath}`)

    logger.info('数据迁移完成!')
    return true
  } catch (err) {
    logger.error('数据迁移失败', err)
    return false
  }
}

/**
 * 迁移用户数据
 */
export const migrateUsers = () => {
  const db = getDb()
  const usersDir = path.join(DATA_DIR, 'users')

  if (!fs.existsSync(usersDir)) {
    return false
  }

  const existingUsers =
    db.prepare<CountRow>('SELECT COUNT(*) as count FROM users').get()?.count ?? 0
  if (existingUsers > 0) {
    logger.info('用户表已有数据，跳过迁移')
    return false
  }

  const insertUser = db.prepare(`
        INSERT OR REPLACE INTO users (username, password, level, created_at)
        VALUES (?, ?, ?, datetime('now'))
    `)

  // bcrypt 哈希以 $2a$/$2b$/$2y$ 开头；其余视为明文，禁止原样入库
  const BCRYPT_HASH_PATTERN = /^\$2[aby]\$/

  try {
    const files = fs.readdirSync(usersDir).filter((f) => f.endsWith('.json'))

    files.forEach((file) => {
      const username = path.basename(file, '.json')
      const userPath = path.join(usersDir, file)
      const userData = JSON.parse(fs.readFileSync(userPath, 'utf8'))

      const password = String(userData.password || '')
      if (!BCRYPT_HASH_PATTERN.test(password)) {
        logger.warn(
          `迁移用户跳过: ${username} — 密码不是 bcrypt 哈希（疑似明文），禁止原样入库，请手动重置该账户密码`
        )
        return
      }

      // 智能判定等级：
      // 1. 如果 JSON 中有 level，以 JSON 为准
      // 2. 如果是默认管理员 (配置的用户名)，强制设为 3 (Admin)
      // 3. 其他用户默认为 1 (User)，避免变成 0 (Guest)
      let finalLevel = 1
      if (userData.level !== undefined) {
        finalLevel = Number(userData.level)
      } else if (username === DEFAULT_ADMIN_NAME || username === process.env.ADMIN_USERNAME) {
        finalLevel = 3
      }

      insertUser.run(username, password, finalLevel)
      logger.info(`迁移用户: ${username}`)
    })

    logger.info(`用户迁移完成: ${files.length} 个`)
    return true
  } catch (err) {
    logger.error('用户迁移失败', err)
    return false
  }
}

/**
 * 迁移设置
 */
export const migrateSettings = () => {
  const db = getDb()
  const settingsPath = path.join(DATA_DIR, 'settings.json')

  if (!fs.existsSync(settingsPath)) {
    return false
  }

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    const insertSetting = db.prepare(`
            INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
        `)

    Object.entries(settings).forEach(([key, value]) => {
      insertSetting.run(key, JSON.stringify(value))
    })

    // 备份
    fs.renameSync(settingsPath, settingsPath + '.migrated.bak')
    logger.info('设置迁移完成')
    return true
  } catch (err) {
    logger.error('设置迁移失败', err)
    return false
  }
}

/**
 * 执行全部迁移
 */
export const runMigration = () => {
  logger.info('=== 开始数据库迁移检查 ===')
  migrateFromJson()
  migrateUsers()
  migrateSettings()
  logger.info('=== 迁移检查完成 ===')
}

export default { migrateFromJson, migrateUsers, migrateSettings, runMigration }
