import { logger } from './logger.js'

export interface QueryStat {
  count: number
  totalTime: number
  avgTime: number
  maxTime: number
  minTime: number
}

export interface SlowQueryRecord {
  name: string
  duration: number
  timestamp: string
  args: string
}

/**
 * 数据库查询性能监控工具
 */
export class QueryMonitor {
  slowQueries: SlowQueryRecord[]
  queryStats: Map<string, QueryStat>

  constructor() {
    this.slowQueries = []
    this.queryStats = new Map()
  }

  /**
   * 包装查询方法，添加性能监控
   * @param queryFn - 查询函数
   * @param queryName - 查询名称
   * @returns 包装后的查询函数
   */
  monitor<TArgs extends unknown[], TResult>(
    queryFn: (...args: TArgs) => TResult,
    queryName: string
  ): (...args: TArgs) => TResult {
    return (...args: TArgs) => {
      const start = Date.now()
      const result = queryFn(...args)
      const duration = Date.now() - start

      // 记录查询统计
      if (!this.queryStats.has(queryName)) {
        this.queryStats.set(queryName, {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          maxTime: 0,
          minTime: Infinity
        })
      }

      const stats = this.queryStats.get(queryName)!
      stats.count++
      stats.totalTime += duration
      stats.avgTime = stats.totalTime / stats.count
      stats.maxTime = Math.max(stats.maxTime, duration)
      stats.minTime = Math.min(stats.minTime, duration)

      // 记录慢查询（超过 100ms）
      if (duration > 100) {
        logger.warn(`慢查询 [${queryName}]: ${duration}ms`, { args })
        this.slowQueries.push({
          name: queryName,
          duration,
          timestamp: new Date().toISOString(),
          args: JSON.stringify(args)
        })

        // 只保留最近 50 条慢查询
        if (this.slowQueries.length > 50) {
          this.slowQueries.shift()
        }
      }

      return result
    }
  }

  /**
   * 获取查询统计信息
   */
  getStats(): Record<string, QueryStat> {
    const stats: Record<string, QueryStat> = {}
    this.queryStats.forEach((value, key) => {
      stats[key] = {
        ...value,
        avgTime: Math.round(value.avgTime * 100) / 100
      }
    })
    return stats
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(limit = 10): SlowQueryRecord[] {
    return this.slowQueries.slice(-limit).reverse()
  }

  /**
   * 清除统计数据
   */
  reset(): void {
    this.slowQueries = []
    this.queryStats.clear()
    logger.info('查询监控数据已重置')
  }
}

// 单例导出
export const queryMonitor = new QueryMonitor()

export default queryMonitor
