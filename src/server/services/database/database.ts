import Database from 'better-sqlite3'
import { logger } from '../../utils/logger.js'
import { queryMonitor } from '../../utils/queryMonitor.js'
import { databasePathService } from './databasePathService.js'
import { databaseSchemaService } from './databaseSchemaService.js'
import { databaseMaintenanceService } from './databaseMaintenanceService.js'
import { databaseStatsService } from './databaseStatsService.js'

// 创建数据库连接（懒加载单例）
let db: Database.Database | null = null
let currentDbPath: string | null = null

type StatementMethodRecord = Record<'all' | 'get' | 'run', (...args: unknown[]) => unknown>

/**
 * 给 better-sqlite3 实例挂上慢查询监控：包装 prepare 返回的 Statement 的
 * all/get/run 与 exec，让 queryMonitor 的 slowRecent/slowTop 观测真实生效。
 *
 * 性能取舍：每次查询增加一次 Date.now() + Map 记账（亚微秒级），对个人站
 * 规模可忽略；换来的 /api/health 慢查询可观测性（超 100ms 的查询会被记录）
 * 在写路径卡顿时有实际排查价值。Statement 方法用实例属性遮蔽原型方法，
 * 仅影响本连接实例，不修改 better-sqlite3 原型。
 */
const attachQueryMonitor = (instance: Database.Database) => {
  const originalPrepare = instance.prepare.bind(instance)
  const originalExec = instance.exec.bind(instance)

  instance.prepare = ((...args: unknown[]) => {
    const statement = originalPrepare(String(args[0]))
    const sql = String(args[0])
    const record = statement as unknown as StatementMethodRecord
    for (const method of ['all', 'get', 'run'] as const) {
      const originalMethod = record[method].bind(statement)
      record[method] = (...callArgs: unknown[]) =>
        queryMonitor.monitor(() => originalMethod(...callArgs), sql)()
    }
    return statement
  }) as Database.Database['prepare']

  instance.exec = ((sql: string) =>
    queryMonitor.monitor(() => originalExec(sql), 'EXEC')()) as Database.Database['exec']

  return instance
}

/**
 * 获取数据库连接（懒加载后保证非 null）
 */
export const getDb = (): Database.Database => {
  if (!db) {
    const dbPath = databasePathService.getDbPath()
    currentDbPath = dbPath
    db = new Database(dbPath)

    // WAL 模式：提升并发读写性能，允许读操作与写操作同时进行
    db.pragma('journal_mode = WAL')
    // WAL 模式下推荐 synchronous=NORMAL：
    // 在保证 crash-safe 的同时减少 WAL 写入的 fsync 频率
    db.pragma('synchronous = NORMAL')
    // 增加缓存页数（默认-2000=2MB，设为-8000=8MB）提升读密集场景性能
    db.pragma('cache_size = -8000')
    // 设置忙等待超时（默认 0 即立即失败），避免并发写冲突时快速抛错。
    // WAL 模式下通常不会触发等待，但保护长时间运行的写事务场景。
    db.pragma('busy_timeout = 5000')
    // 外键约束
    db.pragma('foreign_keys = ON')

    // 先挂监控再初始化 schema，让建表/迁移查询也纳入慢查询统计
    attachQueryMonitor(db)

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
export const backupDatabase = (options: { outputPath?: string } = {}) =>
  databaseMaintenanceService.backupDatabase({
    db: getDb(),
    dbPath: currentDbPath || databasePathService.getDbPath(),
    checkpoint: forceCheckpoint,
    ...(options.outputPath ? { outputPath: options.outputPath } : {})
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
