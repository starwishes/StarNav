import fs from 'node:fs/promises'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'

import { getSwaggerSpec } from './src/server/config/swagger.js'
import { TRUST_PROXY, UPLOADS_DIR } from './src/server/config/index.js'
import { closeDb, forceCheckpoint } from './src/server/services/database/database.js'
import { errorHandler } from './src/server/middleware/errorHandler.js'
import authRoutes from './src/server/routes/auth.js'
import bookmarkRoutes from './src/server/routes/bookmarks.js'
import systemRoutes from './src/server/routes/system.js'
import { initService } from './src/server/services/system/initService.js'
import { APP_VERSION } from './src/server/utils/appVersion.js'
import { logger } from './src/server/utils/logger.js'
import { resolveCorsOriginPolicy } from './src/server/utils/requestOrigin.js'
import { buildErrorBody } from './src/server/utils/response.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = process.env.PORT || 8080
const isProduction = process.env.NODE_ENV === 'production'
const enableUpgradeInsecureRequests = process.env.CSP_UPGRADE_INSECURE_REQUESTS === 'true'
// 生产默认不公开 OpenAPI 描述文件（匿名接口测绘面最小化），显式 API_DOCS_PUBLIC=true 才放行。
// 开发/测试环境不受该开关影响，仍可访问 /api-docs.json（含 swagger-jsdoc 动态生成回退）。
const isApiDocsPublic = process.env.API_DOCS_PUBLIC === 'true'
const DIST_NO_CACHE_FILES = new Set([
  'api-docs.json',
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'registerSW.js'
])
const STATIC_OPENAPI_SPEC_PATH = path.join(__dirname, 'dist', 'api-docs.json')

let appPromise: Promise<import('express').Express> | null = null

const hasStaticOpenApiSpec = async () => {
  try {
    await fs.access(STATIC_OPENAPI_SPEC_PATH)
    return true
  } catch {
    return false
  }
}

const setStaticCacheHeaders = (res: import('express').Response, filePath: string) => {
  if (DIST_NO_CACHE_FILES.has(path.basename(filePath))) {
    res.setHeader('Cache-Control', 'no-cache')
    return
  }

  // dist/assets/*（含 js/css 子目录）均为内容 hash 文件名（vite 输出带 [hash]），
  // 资源内容变化即换名，可安全长缓存；无 hash 的入口文件（index.html/sw.js/
  // manifest）已被上方 DIST_NO_CACHE_FILES 分支处理，不会误命中。
  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }
}

const registerSwaggerUi = async (app: import('express').Express) => {
  if (process.env.NODE_ENV === 'production') {
    logger.info('生产环境：Swagger UI 已禁用，仅提供 OpenAPI JSON 规范')
    return
  }

  try {
    const swaggerUi = (await import('swagger-ui-express')).default
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(null, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'StarNav API Documentation',
        swaggerOptions: {
          url: '/api-docs.json'
        }
      })
    )
    logger.info(`Swagger UI 已启用: http://localhost:${PORT}/api-docs`)
  } catch {
    logger.warn('Swagger UI 未启用: swagger-ui-express 模块未找到')
  }
}

const createConfiguredApp = async () => {
  const app = express()

  app.set('trust proxy', TRUST_PROXY ? 1 : false)

  await initService.init()

  // 构建产物缺失时给出明确指引，避免 SPA 回退请求落到无指引的 500
  try {
    await fs.access(path.join(__dirname, 'dist', 'index.html'))
  } catch {
    logger.warn('未找到 dist/index.html，请先运行 npm run build 后再访问前端页面')
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'none'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          scriptSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:', 'http:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          // Helmet ships this directive by default, so explicitly null it out unless operators opt in.
          upgradeInsecureRequests: isProduction && enableUpgradeInsecureRequests ? [] : null
        }
      },
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  )

  app.use(
    cors((req, callback) => {
      const origin = req.get('origin')
      const corsPolicy = resolveCorsOriginPolicy(origin, req)

      if (corsPolicy.allowed) {
        callback(null, {
          origin: true,
          credentials: corsPolicy.allowCredentials
        })
        return
      }

      // 拒绝跨域：不设置 CORS 头（浏览器端拦截），而不是抛错走 500 错误日志。
      // Cookie 写请求的服务器端来源校验由 auth 中间件 ensureTrustedCookieWriteOrigin 兜底。
      logger.warn('CORS 被拒绝', { origin })
      callback(null, { origin: false, credentials: false })
    })
  )

  app.use(compression())
  app.use(express.json({ limit: '10mb' }))

  app.use((req, res, next) => {
    const url = req.url
    const isFiltered =
      url.includes('/api/favicon') ||
      url.includes('/api/settings') ||
      url.startsWith('/assets/') ||
      url.startsWith('/uploads/')

    if (!isFiltered) {
      // 只落盘 req.path，不打印 query：搜索词/筛选参数等可能包含敏感内容，
      // 日志中仅以占位标记提示存在查询串（第 15 轮审查，对齐 health 脱敏思路）。
      const hasQuery = req.originalUrl.includes('?')
      logger.info(`${req.method} ${req.path}${hasQuery ? '?<query omitted>' : ''}`)
    }

    next()
  })

  // 生产默认关闭 /api-docs.json：必须在 express.static 之前拦截，
  // 否则 dist/api-docs.json（构建产物）会被静态中间件直接公开服务而绕过开关。
  if (isProduction && !isApiDocsPublic) {
    app.use('/api-docs.json', (req, res) => {
      res.status(404).json(buildErrorBody('接口不存在', 'NOT_FOUND'))
    })
  }

  app.use(
    express.static(path.join(__dirname, 'dist'), {
      setHeaders: setStaticCacheHeaders
    })
  )
  // 上传文件（背景图/图标）文件名含时间戳+随机 token，每次替换生成新名，1h 浏览器缓存安全；
  // 不设 immutable——文件名虽唯一，但保留短期缓存窗口即可，避免意外同名覆盖长期不刷新。
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=3600')
      }
    })
  )

  app.use('/api', authRoutes)
  app.use('/api', bookmarkRoutes)
  app.use('/api', systemRoutes)

  // 未匹配的 /api 请求返回 JSON 404，而不是回退到 SPA 的 index.html（200 HTML）
  app.use('/api', (req, res) => {
    res.status(404).json(buildErrorBody('接口不存在', 'NOT_FOUND'))
  })

  await registerSwaggerUi(app)

  app.get('/api-docs.json', async (req, res, next) => {
    try {
      // 生产（含 API_DOCS_PUBLIC=true 放行）：只服务构建产物静态 spec；
      // 无 dist/api-docs.json 时直接 404，绝不在生产动态 import devDependency swagger-jsdoc
      //（非 Docker 部署以 npm ci --omit=dev 安装时该 import 必失败 → 500）。
      if (isProduction) {
        if (await hasStaticOpenApiSpec()) {
          res.setHeader('Cache-Control', 'no-cache')
          res.sendFile(STATIC_OPENAPI_SPEC_PATH)
          return
        }
        res.status(404).json(buildErrorBody('接口不存在', 'NOT_FOUND'))
        return
      }

      // 开发/测试：swagger-jsdoc 动态生成回退（此时 dist/api-docs.json 可能尚未构建）。
      const swaggerSpec = await getSwaggerSpec()
      res.setHeader('Content-Type', 'application/json')
      res.send(swaggerSpec)
    } catch (error) {
      next(error)
    }
  })

  app.get('/{*splat}', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(__dirname, 'dist/index.html'))
  })

  app.use(errorHandler)

  return app
}

export const createApp = async () => {
  if (!appPromise) {
    appPromise = createConfiguredApp().catch((error) => {
      appPromise = null
      throw error
    })
  }

  return appPromise
}

export const startServer = async (port = PORT) => {
  const app = await createApp()

  const server = app.listen(port, () => {
    logger.info(`🚀 StarNav Server v${APP_VERSION}`)
    logger.info(`   Running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`)
  })
  serverRef = server

  server.on('error', (error) => {
    logger.error('服务器启动失败', error)
    process.exit(1)
  })

  return server
}

const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 10_000
let serverRef: import('node:http').Server | null = null
let shuttingDown = false

/**
 * 优雅停机：停止接受新连接 → 等待进行中请求完成 → checkpoint + 关闭数据库。
 * 避免 docker stop 直接 kill 进程导致 WAL 未落盘 / 备份中断。
 * exitCode 供 unhandledRejection/uncaughtException 复用同一流程时以非 0 退出。
 */
const shutdown = (signal: string, exitCode = 0) => {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  logger.info(`收到 ${signal}，开始优雅停机`)

  const forceExit = setTimeout(() => {
    logger.error(`优雅停机超时（${GRACEFUL_SHUTDOWN_TIMEOUT_MS}ms），强制退出`)
    process.exit(1)
  }, GRACEFUL_SHUTDOWN_TIMEOUT_MS)
  forceExit.unref()

  const finish = () => {
    try {
      forceCheckpoint()
    } catch (error) {
      logger.warn('停机 Checkpoint 失败', error)
    }
    closeDb()
    logger.info('已优雅停机')
    process.exit(exitCode)
  }

  const activeServer = serverRef
  if (!activeServer) {
    finish()
    return
  }

  activeServer.close((error) => {
    if (error) {
      logger.error('关闭 HTTP 服务出错', error)
    }
    finish()
  })
}

const registerShutdownHandlers = () => {
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

const registerUnhandledErrorHandlers = () => {
  process.on('unhandledRejection', (reason) => {
    logger.error(
      '未处理的 Promise 拒绝，尝试优雅停机后退出',
      reason instanceof Error ? reason : String(reason)
    )
    // 复用优雅停机流程（close server → checkpoint → closeDb）后再以非 0 退出，
    // 避免 WAL 未落盘；shutdown 内置 10s 强退定时器兜底。
    shutdown('unhandledRejection', 1)
  })
  process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常，尝试优雅停机后退出', error)
    // 与 unhandledRejection 一致：尽力 checkpoint + closeDb 再退出（fail-fast 取舍：
    // 不重试、不恢复，仅保证数据落盘；若停机过程自身抛错，由 10s 强退定时器兜底）。
    shutdown('uncaughtException', 1)
  })
}

const isEntrypoint = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === __filename

if (isEntrypoint || process.env.START_SERVER === 'true') {
  registerShutdownHandlers()
  registerUnhandledErrorHandlers()

  // 顶层启动兜底：init 阶段（migrate/定时备份调度）异常不再以裸 rejection 崩溃，
  // 输出清晰失败文案并带错误码退出。
  try {
    await startServer()
  } catch (error) {
    logger.error('服务器启动失败，请检查数据目录、数据库文件与依赖安装', error)
    process.exit(1)
  }
}

const app = await createApp()

export default app
