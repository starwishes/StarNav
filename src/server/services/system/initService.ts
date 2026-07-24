import { getDb } from '../database/database.js'
import { adminBootstrapService } from '../identity/adminBootstrapService.js'
import { bootstrapDefaultsService } from './bootstrapDefaultsService.js'
import { initRuntimeService } from './initRuntimeService.js'
import { cacheWarmupService } from '../cache/cacheWarmupService.js'

import { runMigration } from '../migrate.js'
import { logger } from '../../utils/logger.js'
import cacheService from '../cache/cacheService.js'

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
      const { backupSchedulerService } = await import('./backupSchedulerService.js')
      await backupSchedulerService.startAutoBackup()
    }
    await cacheWarmupService.warmup(cacheService)

    logger.info('系统初始化完成')
  }
}
