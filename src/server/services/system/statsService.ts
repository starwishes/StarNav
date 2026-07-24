import { UAParser } from 'ua-parser-js'

import { Stats } from '../../models/stats.js'
import cache from '../cache/cacheService.js'
import { CacheKeys } from '../cache/cacheDefinitionService.js'
import { logger } from '../../utils/logger.js'
import { textPayload } from '../../utils/response.js'
const SUMMARY_CACHE_KEY = CacheKeys.statsSummary()
const SUMMARY_CACHE_TTL = 30

export const statsService = {
  getStats() {
    try {
      let summary = cache.get(SUMMARY_CACHE_KEY)

      if (!summary) {
        summary = Stats.getSummary()
        cache.set(SUMMARY_CACHE_KEY, summary, SUMMARY_CACHE_TTL)
      }

      return summary
    } catch (error) {
      logger.error('获取统计数据失败:', error)
      throw Object.assign(new Error('获取统计数据失败'), { statusCode: 500, code: 'INTERNAL_ERROR' })
    }
  },

  getCacheStats() {
    try {
      return cache.getStats()
    } catch (error) {
      logger.error('获取缓存统计失败:', error)
      throw Object.assign(new Error('获取缓存统计失败'), { statusCode: 500, code: 'INTERNAL_ERROR' })
    }
  },

  recordVisit({ ip, userAgent, referrer }: { ip?: string; userAgent?: string; referrer?: string }) {
    try {
      const parser = new UAParser(userAgent)
      const result = parser.getResult()

      Stats.recordVisit({
        ip,
        os: result.os.name || 'Unknown',
        browser: result.browser.name || 'Unknown',
        referrer
      })

      return textPayload('OK')
    } catch (error) {
      logger.error('Record visit error:', error)
      return textPayload('Error')
    }
  }
}
