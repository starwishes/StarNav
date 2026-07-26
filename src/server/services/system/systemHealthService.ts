import { DATA_DIR, UPLOADS_DIR } from '../../config/index.js'
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
  corsOriginsConfigured: Boolean(process.env.CORS_ORIGINS),
  dataDir: DATA_DIR,
  uploadsDir: UPLOADS_DIR
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
      checks.database = getDbStats()
    } catch (error: unknown) {
      checks.database = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        quickCheck: 'failed'
      }
    }

    try {
      const cacheService = (await import('../cache/cacheService.js')).default
      checks.cache = cacheService.getStats()
    } catch (error: unknown) {
      checks.cache = {
        error: error instanceof Error ? error.message : String(error)
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
    } catch (error: unknown) {
      checks.queries = {
        error: error instanceof Error ? error.message : String(error)
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
