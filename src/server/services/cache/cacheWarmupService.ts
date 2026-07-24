import { logger } from '../../utils/logger.js'
import { CacheKeys, CacheTTL } from './cacheDefinitionService.js'
import type { CacheRuntimeService } from './cacheRuntimeService.js'
import type { CategoryRow } from '../../types/sqliteRows.js'

type CacheLike = Pick<CacheRuntimeService, 'set'>

export async function warmup(cacheService: CacheLike) {
  try {
    logger.info('开始缓存预热...')

    const { settingsService } = await import('../system/settingsService.js')
    const settings = settingsService.getAll()
    cacheService.set(CacheKeys.settings(), settings, CacheTTL.VERY_LONG)

    const { getDb } = await import('../database/database.js')
    const db = getDb()
    const categories = db.prepare<CategoryRow>('SELECT * FROM categories ORDER BY sort_order').all()
    cacheService.set(CacheKeys.categories(), categories, CacheTTL.LONG)

    logger.info('缓存预热完成')
  } catch (error) {
    logger.error('缓存预热失败', error)
  }
}

export const cacheWarmupService = {
  warmup
}
