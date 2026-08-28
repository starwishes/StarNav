/**
 * 写操作前整库备份节流器。
 *
 * 背景：backupDatabase 内部是 fs.copyFileSync 整库复制，为同步阻塞调用，
 * 每次书签/分类写操作都触发一次会阻塞事件循环。这里维护"距上次备份时间"，
 * 两次备份间隔小于阈值时跳过本次备份；数据库本身仍有 WAL + checkpoint
 * 兜底，跳过的备份不影响数据正确性，最终一致性由下一次超过间隔的写操作保证。
 */

import { logger } from '../../utils/logger.js'
import { backupDatabase } from './database.js'

/** 最小备份间隔（毫秒）。 */
export const BACKUP_MIN_INTERVAL_MS = 5000

/** 强制备份的最小间隔（毫秒）：force 也不能无上限地同步复制整库。 */
export const BACKUP_FORCE_MIN_INTERVAL_MS = 500

/** 连续失败达到该次数后进入退避，避免每次写操作都同步重试 copyFileSync。 */
export const BACKUP_MAX_CONSECUTIVE_FAILURES = 3

/** 连续失败后的退避间隔（毫秒）。 */
export const BACKUP_FAILURE_BACKOFF_MS = 60_000

let lastBackupAt = 0
let consecutiveFailures = 0
let backoffUntil = 0

/**
 * 节流版备份：距上次备份不足最小间隔时跳过本次备份。
 *
 * @param force 强制备份——仅保留较短的最小间隔（500ms），用于 saveData
 *              这类破坏性操作，确保删除前有尽量新的快照，又不至于每次
 *              同步复制整库阻塞事件循环
 * @returns 是否真正执行了备份（false 表示被节流跳过或备份失败）
 */
export const backupDatabaseThrottled = (force = false): boolean => {
  const now = Date.now()
  // 连续失败后退避：磁盘满/权限问题短期不会自愈，期间不再逐写重试同步复制
  if (backoffUntil > now) {
    return false
  }
  if (consecutiveFailures >= BACKUP_MAX_CONSECUTIVE_FAILURES) {
    consecutiveFailures = 0
  }
  const minInterval = force ? BACKUP_FORCE_MIN_INTERVAL_MS : BACKUP_MIN_INTERVAL_MS
  if (now - lastBackupAt < minInterval) {
    return false
  }
  const result = backupDatabase()
  // 仅在实际备份成功时才推进时间戳：备份失败后，后续写操作仍会重试备份，
  // 避免连续多次写都拿不到可用快照。
  if (result.success) {
    lastBackupAt = now
    consecutiveFailures = 0
    backoffUntil = 0
  } else {
    consecutiveFailures += 1
    if (consecutiveFailures >= BACKUP_MAX_CONSECUTIVE_FAILURES) {
      backoffUntil = now + BACKUP_FAILURE_BACKOFF_MS
      logger.error(
        `数据库备份连续失败 ${BACKUP_MAX_CONSECUTIVE_FAILURES} 次，进入退避 ${BACKUP_FAILURE_BACKOFF_MS / 1000}s`,
        result.error
      )
    }
  }
  return result.success
}

/** 重置节流状态（仅供测试使用）。 */
export const resetBackupThrottle = (): void => {
  lastBackupAt = 0
  consecutiveFailures = 0
  backoffUntil = 0
}
