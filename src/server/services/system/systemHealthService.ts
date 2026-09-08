import { APP_VERSION } from '../../utils/appVersion.js'
import { successPayload } from '../../utils/response.js'
const getRuntimeChecks = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  authCookieSecureMode:
    process.env.AUTH_COOKIE_SECURE === 'true'
      ? 'always'
      : process.env.AUTH_COOKIE_SECURE === 'false'
        ? 'never'
        : 'auto',
  cspUpgradeInsecureRequests: process.env.CSP_UPGRADE_INSECURE_REQUESTS === 'true',
  corsOriginsConfigured: Boolean(process.env.CORS_ORIGINS)
  // 注意：不暴露 DATA_DIR/UPLOADS_DIR 等本地文件系统路径（公开端点信息泄露）
})

export const systemHealthService = {
  /**
   * 健康检查。匿名调用（docker healthcheck/探活）只返回最小负载 {status, timestamp,
   * checks.database.ok}（不含 version——精确版本号属部署指纹，仅管理员端点返回）；
   * 登录管理员才附加 version/运行时/缓存/内存/慢查询明细。
   * 这些明细含 NODE_ENV、cookie/CSP 姿态、慢查询内部名与内存/uptime 等运维指纹，
   * 匿名公开属于信息泄露（第 25 轮盲审 L1，与"公开端点不暴露本地路径/错误原文"
   * 的既有约定同族；第 30 轮同步 JSDoc 与实现）。
   */
  async getHealth({ detailed = false }: { detailed?: boolean } = {}) {
    let database: {
      ok: boolean
      error?: string
      quickCheck?: string
      [key: string]: unknown
    }

    try {
      const { getDbStats } = await import('../database/database.js')
      const { dbPath, ...publicDbStats } = getDbStats()
      void dbPath
      // 公开端点不暴露本地文件系统路径（与 getRuntimeChecks 的注释约定一致）
      database = publicDbStats
    } catch {
      // 公开端点不泄露原始异常（SQLite 错误可能内嵌本地文件路径）
      database = {
        ok: false,
        error: '数据库检查失败',
        quickCheck: 'failed'
      }
    }

    const checks: Record<string, unknown> = {
      // 匿名（detailed=false）只下发 ok：size/tables/counts（含 userCount）/writable/
      // journalMode 等属运维指纹，曾随最小负载整份泄露（第 25 轮 L1 修复不彻底，第 26 轮收口）
      database: detailed ? database : { ok: database.ok === true }
    }

    if (detailed) {
      checks.runtime = getRuntimeChecks()

      try {
        const { cacheService } = await import('../cache/cacheService.js')
        checks.cache = cacheService.getStats()
      } catch {
        checks.cache = {
          error: '缓存检查失败'
        }
      }

      try {
        const { queryMonitor } = await import('../../utils/queryMonitor.js')
        const slow = queryMonitor.getSlowQueries(5)
        checks.queries = {
          slowRecent: slow.length,
          slowTop: slow.map((entry) => ({
            name: entry.name,
            durationMs: entry.duration,
            at: entry.timestamp
          }))
        }
      } catch {
        checks.queries = {
          error: '慢查询检查失败'
        }
      }

      const memUsage = process.memoryUsage()
      checks.memory = {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
      }
      checks.uptime = Math.round(process.uptime())
    }

    const healthy = database.ok
    const data: Record<string, unknown> = {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks
    }
    // 精确版本号属部署指纹（配合公开 CVE 可精确定位），仅管理员端点返回（第 27 轮盲审 L1）
    if (detailed) {
      data.version = APP_VERSION
    }
    return successPayload(data, 'Success', healthy ? 200 : 503)
  }
}
