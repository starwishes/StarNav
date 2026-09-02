import { getDb } from '../database/database.js'
import { adminBootstrapService } from '../identity/adminBootstrapService.js'
import { bootstrapDefaultsService } from './bootstrapDefaultsService.js'
import { initRuntimeService } from './initRuntimeService.js'

import { runMigration } from '../migrate.js'
import { logger } from '../../utils/logger.js'

/**
 * 系统初始化编排入口
 */
export const initService = {
  async init() {
    logger.info('正在初始化系统...')

    initRuntimeService.prepareRuntime()

    getDb()
    logger.info('SQLite 数据库初始化完成')

    runMigration()
    adminBootstrapService.initAdminAccount()
    bootstrapDefaultsService.initSettings()
    bootstrapDefaultsService.initDefaultData()
    if (process.env.NODE_ENV !== 'test') {
      // 定时备份/会话清理属可降级调度：node-cron 动态 import 失败（如依赖缺失）
      // 不应阻断整个进程启动，降级为日志告警。
      try {
        const { backupSchedulerService } = await import('./backupSchedulerService.js')
        await backupSchedulerService.startAutoBackup()
      } catch (error: unknown) {
        // 降级日志需明确提示：定时清理（过期会话/定时备份）不可用，
        // 否则运维会误以为调度仍在运行、过期会话被静默累积。
        logger.warn('定时备份/会话清理调度不可用，已降级跳过；定时清理将不会执行', error)
      }
    }

    logger.info('系统初始化完成')
  }
}
