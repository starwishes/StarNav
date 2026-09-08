import NodeCache from 'node-cache'
import { logger } from '../../utils/logger.js'

const DEFAULT_CACHE_OPTIONS = {
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
  // maxKeys=1000 是容量上限而非"超限自动逐出最旧"：node-cache 满载后新 set 直接抛
  // ECACHEFULL（TTL 过期才删键）。search:{level}:{keyword} 等键受 60s TTL 约束；
  // 满载时 set() 的 try/catch 会把写缓存降级为跳过，绝不让缓存写失败打挂已成功的数据
  // 请求（第 30 轮盲审 M1）。
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
    try {
      const success =
        ttl === undefined ? this.cache.set(key, value) : this.cache.set(key, value, ttl)

      if (success) {
        logger.debug(`缓存设置: ${key}`)
      }

      return success
    } catch (error) {
      // 满载（ECACHEFULL）等写失败仅降级跳过：数据已由调用方从 DB 取到，
      // 缓存写失败 ≠ 业务失败（第 30 轮盲审 M1）
      logger.warn(`缓存写入失败（可能已满载）: ${key}`, error)
      return false
    }
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
}

export const cacheRuntimeService = new CacheRuntimeService()
