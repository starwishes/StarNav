import { backupDatabase } from '../database/database.js'
import { logger } from '../../utils/logger.js'

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

    cron.schedule('0 2 * * *', () => {
      logger.info('开始定时备份数据库')
      const result = backupDatabase()
      if (result.success) {
        logger.info(`定时备份成功: ${result.path}`)
      } else {
        logger.error(`定时备份失败: ${result.error}`)
      }
    })

    logger.info('自动备份任务已启动（每天凌晨 2:00）')
  }
}
