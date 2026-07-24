import Database from 'better-sqlite3'
import { logger } from '../../utils/logger.js'
import { databasePathService } from './databasePathService.js'
import { databaseSchemaService } from './databaseSchemaService.js'
import { databaseMaintenanceService } from './databaseMaintenanceService.js'
import { databaseStatsService } from './databaseStatsService.js'

// 创建数据库连接（懒加载单例）
let db: Database.Database | null = null
let currentDbPath: string | null = null

/**
 * 获取数据库连接（懒加载后保证非 null）
 */
export const getDb = (): Database.Database => {
  if (!db) {
    const dbPath = databasePathService.getDbPath()
    currentDbPath = dbPath
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL') // 启用 WAL 模式提升并发性能
    db.pragma('foreign_keys = ON')
    databaseSchemaService.initSchema(db)
    logger.info(
      `SQLite 数据库已连接: ${dbPath} (Worker: ${process.env.VITEST_WORKER_ID || 'single'})`
    )
  }
  return db
}

/**
 * 强制执行 WAL Checkpoint
 * 使用 RESTART 模式确保日志完全截断并同步到主库
 */
export const forceCheckpoint = () => databaseMaintenanceService.forceCheckpoint(getDb())

/**
 * 自动备份数据库
 */
export const backupDatabase = () =>
  databaseMaintenanceService.backupDatabase({
    dbPath: currentDbPath || databasePathService.getDbPath(),
    checkpoint: forceCheckpoint
  })

/**
 * 关闭数据库连接
 */
export const closeDb = () => {
  if (db) {
    db.close()
    db = null
    logger.info('数据库连接已关闭')
  }
}

/**
 * 获取统计信息
 */
export const getDbStats = () => {
  return databaseStatsService.getDbStats(getDb(), currentDbPath)
}

export default { getDb, closeDb, getDbStats, forceCheckpoint, backupDatabase }
