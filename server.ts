import fs from 'node:fs/promises'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'

import { getSwaggerSpec } from './src/server/config/swagger.js'
import { TRUST_PROXY, UPLOADS_DIR } from './src/server/config/index.js'
import { errorHandler } from './src/server/middleware/errorHandler.js'
import { statsLogger } from './src/server/middleware/statsLogger.js'
import authRoutes from './src/server/routes/auth.js'
import bookmarkRoutes from './src/server/routes/bookmarks.js'
import statsRoutes from './src/server/routes/stats.js'
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
          connectSrc: ["'self'", 'https:', 'http:'],
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

      logger.warn('CORS 被拒绝', { origin })
      callback(new Error('CORS not allowed'))
    })
  )

  app.use(compression())
  app.use(express.json({ limit: '10mb' }))
  app.use(statsLogger)

  app.use((req, res, next) => {
    const url = req.url
    const isFiltered =
      url.includes('/api/favicon') ||
      url.includes('/api/settings') ||
      url.startsWith('/assets/') ||
      url.startsWith('/uploads/')

    if (!isFiltered) {
      logger.info(`${req.method} ${url}`)
    }

    next()
  })

  app.use(
    express.static(path.join(__dirname, 'dist'), {
      setHeaders: setStaticCacheHeaders
    })
  )
  app.use('/uploads', express.static(UPLOADS_DIR))

  app.use('/api', authRoutes)
  app.use('/api', bookmarkRoutes)
  app.use('/api', systemRoutes)
  app.use('/api', statsRoutes)

  // 未匹配的 /api 请求返回 JSON 404，而不是回退到 SPA 的 index.html（200 HTML）
  app.use('/api', (req, res) => {
    res.status(404).json(buildErrorBody('接口不存在', 'NOT_FOUND'))
  })

  await registerSwaggerUi(app)

  app.get('/api-docs.json', async (req, res, next) => {
    try {
      if (isProduction && (await hasStaticOpenApiSpec())) {
        res.setHeader('Cache-Control', 'no-cache')
        res.sendFile(STATIC_OPENAPI_SPEC_PATH)
        return
      }

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

  return app.listen(port, () => {
    logger.info(`🚀 StarNav Server v${APP_VERSION}`)
    logger.info(`   Running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`)
  })
}

const isEntrypoint = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === __filename

if (isEntrypoint || process.env.START_SERVER === 'true') {
  await startServer()
}

const app = await createApp()

export default app
