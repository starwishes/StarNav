import fs from 'fs'
import path from 'path'

import { logger } from '../../utils/logger.js'
import { assertRestorableBackup } from './databaseBackupValidator.js'
import type { getDb } from './database.js'

type SqliteDb = ReturnType<typeof getDb>

const ensureParentDir = (targetPath: string) => {
  const parentDir = path.dirname(targetPath)
  fs.mkdirSync(parentDir, { recursive: true })
}

const removeSidecarFiles = (dbPath: string) => {
  for (const suffix of ['-wal', '-shm']) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true })
  }
}

/**
 * 用 SQLite VACUUM INTO 生成一致性快照。
 * 相比「checkpoint + fs.copyFileSync」，VACUUM INTO 在事务内读取一致快照，
 * 即使备份期间有并发写也不会产生撕裂备份。
 * VACUUM INTO 不支持绑定参数，且拒绝覆盖已存在文件 → 先删除目标再执行。
 */
const vacuumInto = (db: SqliteDb, outputPath: string) => {
  fs.rmSync(outputPath, { force: true })
  const escapedPath = outputPath.replace(/'/g, "''")
  db.exec(`VACUUM INTO '${escapedPath}'`)
}

export const databaseMaintenanceService = {
  /**
   * 强制 WAL Checkpoint（RESTART）。
   *
   * 取舍说明：RESTART 会阻塞事件循环、把整段 WAL 合并回主库并截断日志，
   * 使并发的读不可用（WAL 模式下 checkpoint 期间新读会被阻塞），部分抵消 WAL
   * 的并发读收益。个人站规模可接受，换来三点确定性：
   * 1. 写操作完成后主库文件即包含最新数据，崩溃后无需回放 WAL 即可读取；
   * 2. 保证随后的备份（VACUUM INTO）/文件快照拿到一致、完整的数据；
   * 3. 优雅停机时 WAL 全部落盘，避免 docker stop 强杀丢最近写入。
   * 若未来需要更高写并发，可评估改用 PASSIVE/TRUNCATE（不阻塞读，但可能
   * 保留未合并的 WAL 尾部），对正确性无影响、只影响上述"主库即时完整"保证。
   */
  forceCheckpoint(db: SqliteDb) {
    try {
      db.pragma('wal_checkpoint(RESTART)')
      logger.debug('数据库 Checkpoint (RESTART) 执行成功')
    } catch (error: unknown) {
      logger.error('数据库 Checkpoint 失败', error)
    }
  },

  /**
   * 备份/恢复服务的返回值使用非 HTTP 工具信封：仅携带 success/error/code/path，
   * 供 CLI（scripts/tools）与调度器消费，不等同于 HTTP 响应体的 SuccessBody/ErrorBody。
   * code 用于区分"文件缺失"（BACKUP_FAILED）与"成功"（BACKUP_OK），便于脚本判定。
   */
  backupDatabase({
    db,
    dbPath,
    checkpoint,
    outputPath = `${dbPath}.bak`
  }: {
    db: SqliteDb
    dbPath: string
    checkpoint?: () => void
    outputPath?: string
  }) {
    try {
      if (!fs.existsSync(dbPath)) {
        return { success: false, code: 'BACKUP_FAILED', error: '数据库文件不存在' }
      }

      ensureParentDir(outputPath)
      checkpoint?.()

      vacuumInto(db, outputPath)
      logger.debug(`数据库已备份: ${outputPath}`)
      return { success: true, code: 'BACKUP_OK', path: outputPath }
    } catch (error: unknown) {
      logger.error('数据库备份失败', error)
      return {
        success: false,
        code: 'BACKUP_FAILED',
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  },

  /**
   * 恢复数据库。
   *
   * 前置条件（第 15 轮审查）：调用前必须已关闭当前数据库连接或传入 checkpoint 回调，
   * 否则活动连接上的未落盘 WAL 数据可能不在快照里。CLI 工具 restoreDatabase.ts 已先
   * closeDb() 再调用；其他调用方请自行保证（或传 checkpoint 先做 RESTART checkpoint）。
   * 恢复前会对备份做合法 SQLite 校验（assertRestorableBackup），失败即拒绝恢复，
   * 不会覆盖现有数据库。
   */
  restoreDatabase({
    dbPath,
    backupPath,
    snapshotPath = null,
    checkpoint
  }: {
    dbPath: string
    backupPath: string
    snapshotPath?: string | null
    checkpoint?: () => void
  }) {
    try {
      if (!fs.existsSync(backupPath)) {
        return { success: false, code: 'RESTORE_FAILED', error: '备份文件不存在' }
      }

      // 覆盖前校验备份为合法 SQLite，损坏/非 DB 文件直接拒绝恢复
      assertRestorableBackup(backupPath)

      let previousBackupPath: string | null = null

      if (fs.existsSync(dbPath)) {
        checkpoint?.()
        previousBackupPath = snapshotPath || `${dbPath}.pre-restore.bak`
        ensureParentDir(previousBackupPath)
        fs.copyFileSync(dbPath, previousBackupPath)
      } else {
        ensureParentDir(dbPath)
      }

      removeSidecarFiles(dbPath)
      fs.copyFileSync(backupPath, dbPath)
      logger.debug(`数据库已恢复: ${dbPath}`)
      return {
        success: true,
        code: 'RESTORE_OK',
        path: dbPath,
        previousBackupPath
      }
    } catch (error: unknown) {
      logger.error('数据库恢复失败', error)
      return {
        success: false,
        code: 'RESTORE_FAILED',
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
}
