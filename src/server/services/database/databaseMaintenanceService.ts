import fs from 'fs'
import path from 'path'

import { logger } from '../../utils/logger.js'
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

export const databaseMaintenanceService = {
  forceCheckpoint(db: SqliteDb) {
    try {
      db.pragma('wal_checkpoint(RESTART)')
      logger.debug('数据库 Checkpoint (RESTART) 执行成功')
    } catch (error: unknown) {
      logger.error('数据库 Checkpoint 失败', error)
    }
  },

  backupDatabase({
    dbPath,
    checkpoint,
    outputPath = `${dbPath}.bak`
  }: {
    dbPath: string
    checkpoint: () => void
    outputPath?: string
  }) {
    try {
      if (!fs.existsSync(dbPath)) {
        return { success: false, error: '数据库文件不存在' }
      }

      checkpoint()

      ensureParentDir(outputPath)
      fs.copyFileSync(dbPath, outputPath)
      logger.debug(`数据库已备份: ${outputPath}`)
      return { success: true, path: outputPath }
    } catch (error: unknown) {
      logger.error('数据库备份失败', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  },

  restoreDatabase({
    dbPath,
    backupPath,
    snapshotPath = null
  }: {
    dbPath: string
    backupPath: string
    snapshotPath?: string | null
  }) {
    try {
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: '备份文件不存在' }
      }

      let previousBackupPath: string | null = null

      if (fs.existsSync(dbPath)) {
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
        path: dbPath,
        previousBackupPath
      }
    } catch (error: unknown) {
      logger.error('数据库恢复失败', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  }
}
