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
  async getHealth() {
    const checks: {
      database: { ok: boolean; error?: string; quickCheck?: string; [key: string]: unknown }
      cache: Record<string, unknown>
      queries?: Record<string, unknown>
      memory: Record<string, unknown>
      uptime: number
      runtime: ReturnType<typeof getRuntimeChecks>
    } = {
      database: { ok: true },
      cache: {},
      memory: {},
      uptime: 0,
      runtime: getRuntimeChecks()
    }

    try {
      const { getDbStats } = await import('../database/database.js')
      const { dbPath, ...publicDbStats } = getDbStats()
      void dbPath
      // 公开端点不暴露本地文件系统路径（与 getRuntimeChecks 的注释约定一致）
      checks.database = publicDbStats
    } catch {
      // 公开端点不泄露原始异常（SQLite 错误可能内嵌本地文件路径）
      checks.database = {
        ok: false,
        error: '数据库检查失败',
        quickCheck: 'failed'
      }
    }

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

    const healthy = checks.database.ok
    return successPayload(
      {
        status: healthy ? 'healthy' : 'unhealthy',
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        checks
      },
      'Success',
      healthy ? 200 : 503
    )
  }
}
