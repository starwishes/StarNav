/**
 * 写操作前整库备份节流器。
 *
 * 背景：backupDatabase 内部是 fs.copyFileSync 整库复制，为同步阻塞调用，
 * 每次书签/分类写操作都触发一次会阻塞事件循环。这里维护"距上次备份时间"，
 * 两次备份间隔小于阈值时跳过本次备份；数据库本身仍有 WAL + checkpoint
 * 兜底，跳过的备份不影响数据正确性，最终一致性由下一次超过间隔的写操作保证。
 */

import { backupDatabase } from './database.js'

/** 最小备份间隔（毫秒）。 */
export const BACKUP_MIN_INTERVAL_MS = 5000

let lastBackupAt = 0

/**
 * 节流版备份：距上次备份不足 BACKUP_MIN_INTERVAL_MS 时跳过本次备份。
 *
 * @returns 是否真正执行了备份（false 表示被节流跳过）
 */
export const backupDatabaseThrottled = (): boolean => {
  const now = Date.now()
  if (now - lastBackupAt < BACKUP_MIN_INTERVAL_MS) {
    return false
  }
  lastBackupAt = now
  backupDatabase()
  return true
}

/** 重置节流状态（仅供测试使用）。 */
export const resetBackupThrottle = (): void => {
  lastBackupAt = 0
}
