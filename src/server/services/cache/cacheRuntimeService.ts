import NodeCache from 'node-cache'
import { logger } from '../../utils/logger.js'

const DEFAULT_CACHE_OPTIONS = {
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
  // 防止 search:level:keyword:limit 这类键随独特关键词无界增长（超出按最旧逐出）
  maxKeys: 1000
}

const createEmptyStats = () => ({
  hits: 0,
  misses: 0,
  sets: 0
})

const formatHitRate = (hits: number, misses: number) => {
  const total = hits + misses
  if (total === 0) {
    return '0%'
  }

  return `${((hits / total) * 100).toFixed(2)}%`
}

export class CacheRuntimeService {
  cache: NodeCache
  stats: ReturnType<typeof createEmptyStats>

  constructor(options: ConstructorParameters<typeof NodeCache>[0] = DEFAULT_CACHE_OPTIONS) {
    this.cache = new NodeCache(options)
    this.stats = createEmptyStats()

    logger.info('缓存服务已初始化')
  }

  get(key: string) {
    const value = this.cache.get(key)

    if (value !== undefined) {
      this.stats.hits++
      logger.debug(`缓存命中: ${key}`)
    } else {
      this.stats.misses++
      logger.debug(`缓存未命中: ${key}`)
    }

    return value
  }

  set(key: string, value: unknown, ttl?: number) {
    this.stats.sets++
    const success = ttl === undefined ? this.cache.set(key, value) : this.cache.set(key, value, ttl)

    if (success) {
      logger.debug(`缓存设置: ${key}`)
    }

    return success
  }

  del(key: string) {
    const count = this.cache.del(key)

    if (count > 0) {
      logger.debug(`缓存删除: ${key}`)
    }

    return count
  }

  flush() {
    this.cache.flushAll()
    logger.info('缓存已清空')
  }

  getStats() {
    return {
      ...this.stats,
      keys: this.cache.keys().length,
      hitRate: formatHitRate(this.stats.hits, this.stats.misses)
    }
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T> | T, ttl?: number) {
    let value = this.get(key) as T | undefined
    if (value !== undefined) {
      return value
    }

    try {
      value = await fetchFn()
      this.set(key, value, ttl)
      return value
    } catch (error) {
      logger.error(`缓存获取失败: ${key}`, error)
      throw error
    }
  }
}

export const cacheRuntimeService = new CacheRuntimeService()
