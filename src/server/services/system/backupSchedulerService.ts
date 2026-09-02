import fs from 'fs'
import path from 'path'

import { DATA_DIR } from '../../config/index.js'
import { backupDatabase, getDb } from '../database/database.js'
import { logger } from '../../utils/logger.js'

type SqliteDb = ReturnType<typeof getDb>

/** 定时备份保留份数。 */
export const BACKUP_RETENTION = 7

/** audit_logs 保留策略：最多保留的天数与行数上限（任一条件触发即裁剪）。 */
export const AUDIT_LOG_MAX_AGE_DAYS = 90
export const AUDIT_LOG_MAX_ROWS = 10_000

/** 定时备份输出目录：DATA_PATH/backups（与手动备份工具一致）。 */
export const getBackupsDir = () => path.join(DATA_DIR, 'backups')

const formatTimestamp = (date = new Date()) => date.toISOString().replace(/[:.]/g, '-')

/**
 * 裁剪过期 audit_logs：按年龄（90 天）与行数（10000 条）双上限清理，对齐
 * 清单 C"日志/统计表保留策略"。created_at 存在历史（datetime('now') 空格分隔）
 * 与新库（strftime ISO8601 带 T/Z）两种格式，统一用 strftime('%s') 解析为
 * 时间戳比较，避免字符串比较跨格式失序。
 * @returns 实际删除的行数
 */
export const pruneAuditLogs = (
  db: SqliteDb = getDb(),
  { maxAgeDays = AUDIT_LOG_MAX_AGE_DAYS, maxRows = AUDIT_LOG_MAX_ROWS } = {}
): number => {
  let removed = 0

  const ageRemoved = db
    .prepare(
      `DELETE FROM audit_logs
       WHERE created_at IS NOT NULL
         AND strftime('%s', created_at) < strftime('%s', 'now', ?)`
    )
    .run(`-${maxAgeDays} days`).changes
  removed += ageRemoved

  const countRemoved = db
    .prepare(
      `DELETE FROM audit_logs
       WHERE id NOT IN (SELECT id FROM audit_logs ORDER BY id DESC LIMIT ?)`
    )
    .run(maxRows).changes
  removed += countRemoved

  if (removed > 0) {
    logger.info(`已裁剪 ${removed} 条过期审计日志（保留 ${maxAgeDays} 天 / ${maxRows} 条上限）`)
  }

  return removed
}

/**
 * 清理超过保留份数的历史定时备份。
 * 测试环境下跳过，避免触碰真实数据目录。
 */
export const pruneBackups = (retention = BACKUP_RETENTION): number => {
  if (process.env.NODE_ENV === 'test') {
    return 0
  }

  const backupsDir = getBackupsDir()

  try {
    const backups = fs
      .readdirSync(backupsDir)
      .filter(
        (name) =>
          name.startsWith('starnav-') &&
          name.endsWith('.db.bak') &&
          // 排除恢复前的安全快照（starnav-pre-restore-*），它们不占计划备份保留位
          !name.startsWith('starnav-pre-restore-')
      )
      .sort()
      .reverse()

    let removed = 0
    for (const stale of backups.slice(retention)) {
      fs.rmSync(path.join(backupsDir, stale), { force: true })
      removed += 1
    }

    if (removed > 0) {
      logger.info(`已清理 ${removed} 个过期定时备份，保留最近 ${retention} 份`)
    }

    return removed
  } catch (error: unknown) {
    logger.warn('清理历史定时备份失败', error)
    return 0
  }
}

let cronPromise: Promise<typeof import('node-cron').default> | null = null

const getCron = (): Promise<typeof import('node-cron').default> => {
  if (!cronPromise) {
    cronPromise = import('node-cron')
      .then(({ default: cron }) => cron)
      .catch((error) => {
        cronPromise = null
        throw error
      })
  }

  return cronPromise
}

export const backupSchedulerService = {
  async startAutoBackup() {
    const cron = await getCron()

    // node-cron 按容器本地时区执行（受 TZ 环境变量控制），与应用展示层的
    // timezone 系统设置（src/shared/security/urlSafety.ts 的 SUPPORTED_TIMEZONES）
    // 相互独立。如需让"凌晨 2 点"匹配展示时区，请把容器 TZ 设为该时区。
    cron.schedule('0 2 * * *', () => {
      logger.info('开始定时备份数据库')

      const outputPath = path.join(getBackupsDir(), `starnav-${formatTimestamp()}.db.bak`)
      const result = backupDatabase({ outputPath })

      if (result.success) {
        logger.info(`定时备份成功: ${result.path}`)
        pruneBackups()
      } else {
        logger.error(`定时备份失败: ${result.error}`)
      }
    })

    // 每日凌晨清理过期会话与审计日志（sessionService.cleanup 无其他调用方，仅此处兜底）
    cron.schedule('0 3 * * *', () => {
      import('../identity/sessionService.js')
        .then(({ sessionService }) => {
          const removed = sessionService.cleanup()
          if (removed > 0) {
            logger.info(`已清理 ${removed} 个过期会话`)
          }
        })
        .catch((error: unknown) => {
          logger.warn('清理过期会话失败', error)
        })

      try {
        pruneAuditLogs()
      } catch (error: unknown) {
        logger.warn('清理过期审计日志失败', error)
      }
    })

    logger.info('自动备份任务已启动（每天凌晨 2:00，保留最近 7 份）')
  }
}
