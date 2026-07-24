import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createAppMock = () => ({
  set: vi.fn(),
  use: vi.fn(),
  get: vi.fn(),
  listen: vi.fn((port, callback) => {
    callback?.()
    return { close: vi.fn(), port }
  })
})

const loadServerModule = async ({
  nodeEnv = 'test',
  corsOrigins,
  cspUpgradeInsecureRequests,
  trustProxy,
  swaggerUiAvailable = true,
  staticOpenApiSpecAvailable = false
} = {}) => {
  vi.resetModules()

  const originalNodeEnv = process.env.NODE_ENV
  const originalCorsOrigins = process.env.CORS_ORIGINS
  const originalCspUpgradeInsecureRequests = process.env.CSP_UPGRADE_INSECURE_REQUESTS
  const originalTrustProxy = process.env.TRUST_PROXY

  process.env.NODE_ENV = nodeEnv
  if (corsOrigins === undefined) {
    delete process.env.CORS_ORIGINS
  } else {
    process.env.CORS_ORIGINS = corsOrigins
  }
  if (cspUpgradeInsecureRequests === undefined) {
    delete process.env.CSP_UPGRADE_INSECURE_REQUESTS
  } else {
    process.env.CSP_UPGRADE_INSECURE_REQUESTS = cspUpgradeInsecureRequests
  }
  if (trustProxy === undefined) {
    delete process.env.TRUST_PROXY
  } else {
    process.env.TRUST_PROXY = trustProxy
  }

  const app = createAppMock()
  const expressFactory = vi.fn(() => app)
  const jsonMiddleware = { type: 'json' }
  const staticMiddlewares = []
  expressFactory.json = vi.fn(() => jsonMiddleware)
  expressFactory.static = vi.fn((target, options = {}) => {
    const middleware = { type: 'static', target, options }
    staticMiddlewares.push(middleware)
    return middleware
  })

  const compressionMiddleware = { type: 'compression' }
  const helmetMiddleware = { type: 'helmet' }
  const corsMiddleware = { type: 'cors' }
  const swaggerServe = { type: 'swagger-serve' }
  const swaggerUiHandler = { type: 'swagger-ui' }
  const swaggerSetup = vi.fn(() => swaggerUiHandler)
  const getSwaggerSpec = vi
    .fn()
    .mockResolvedValue({ openapi: '3.0.0', info: { title: 'StarNav API' } })
  const compression = vi.fn(() => compressionMiddleware)
  const helmet = vi.fn(() => helmetMiddleware)
  let corsDelegate = null
  const cors = vi.fn((delegate) => {
    corsDelegate = delegate
    return corsMiddleware
  })

  const init = vi.fn().mockResolvedValue(undefined)
  const logger = {
    info: vi.fn(),
    warn: vi.fn()
  }
  const fsAccess = vi.fn().mockImplementation(async () => {
    if (!staticOpenApiSpecAvailable) {
      throw new Error('missing')
    }
  })

  const authRoutes = { name: 'authRoutes' }
  const bookmarkRoutes = { name: 'bookmarkRoutes' }
  const systemRoutes = { name: 'systemRoutes' }
  const statsRoutes = { name: 'statsRoutes' }

  vi.doMock('express', () => ({
    default: expressFactory
  }))
  vi.doMock('compression', () => ({
    default: compression
  }))
  vi.doMock('cors', () => ({
    default: cors
  }))
  vi.doMock('helmet', () => ({
    default: helmet
  }))
  vi.doMock('node:fs/promises', () => ({
    default: {
      access: fsAccess
    }
  }))
  vi.doMock('../../src/server/config/swagger.js', () => ({
    getSwaggerSpec
  }))
  vi.doMock('../../src/server/config/index.js', () => ({
    TRUST_PROXY: trustProxy === 'true',
    UPLOADS_DIR: '/tmp/uploads'
  }))
  vi.doMock('../../src/server/middleware/errorHandler.js', () => ({
    errorHandler: { type: 'errorHandler' }
  }))
  vi.doMock('../../src/server/middleware/statsLogger.js', () => ({
    statsLogger: { type: 'statsLogger' }
  }))
  vi.doMock('../../src/server/routes/auth.js', () => ({
    default: authRoutes
  }))
  vi.doMock('../../src/server/routes/bookmarks.js', () => ({
    default: bookmarkRoutes
  }))
  vi.doMock('../../src/server/routes/system.js', () => ({
    default: systemRoutes
  }))
  vi.doMock('../../src/server/routes/stats.js', () => ({
    default: statsRoutes
  }))
  vi.doMock('../../src/server/services/system/initService.js', () => ({
    initService: {
      init
    }
  }))
  vi.doMock('../../src/server/utils/appVersion.js', () => ({
    APP_VERSION: '9.9.9-test'
  }))
  vi.doMock('../../src/server/utils/logger.js', () => ({
    logger
  }))

  if (swaggerUiAvailable) {
    vi.doMock('swagger-ui-express', () => ({
      default: {
        serve: swaggerServe,
        setup: swaggerSetup
      }
    }))
  } else {
    vi.doMock('swagger-ui-express', () => {
      throw new Error('missing')
    })
  }

  const module = await import('../../server.js')

  return {
    module,
    app,
    expressFactory,
    compression,
    compressionMiddleware,
    helmet,
    helmetMiddleware,
    cors,
    corsMiddleware,
    corsDelegate,
    jsonMiddleware,
    staticMiddlewares,
    swaggerServe,
    swaggerSetup,
    swaggerUiHandler,
    getSwaggerSpec,
    init,
    logger,
    fsAccess,
    authRoutes,
    bookmarkRoutes,
    systemRoutes,
    statsRoutes,
    restoreEnv() {
      process.env.NODE_ENV = originalNodeEnv
      process.env.CORS_ORIGINS = originalCorsOrigins
      process.env.CSP_UPGRADE_INSECURE_REQUESTS = originalCspUpgradeInsecureRequests
      process.env.TRUST_PROXY = originalTrustProxy
    }
  }
}

describe('server app assembly', () => {
  let runtime

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    runtime?.restoreEnv?.()
    runtime = null
  })

  it('assembles middleware, routes, swagger, and caches createApp()', async () => {
    runtime = await loadServerModule({
      nodeEnv: 'test',
      corsOrigins: 'https://allowed.test,https://second.test'
    })

    const { module, app, init, logger, corsDelegate, swaggerSetup, swaggerServe, getSwaggerSpec } =
      runtime

    expect(init).toHaveBeenCalledTimes(1)
    expect(app.set).toHaveBeenCalledWith('trust proxy', false)
    expect(runtime.helmet).toHaveBeenCalledWith(
      expect.objectContaining({
        contentSecurityPolicy: expect.any(Object),
        crossOriginOpenerPolicy: false,
        crossOriginEmbedderPolicy: false
      })
    )
    expect(runtime.compression).toHaveBeenCalledTimes(1)
    expect(runtime.expressFactory.json).toHaveBeenCalledWith({ limit: '10mb' })
    expect(app.use).toHaveBeenCalledWith(runtime.helmetMiddleware)
    expect(app.use).toHaveBeenCalledWith(runtime.corsMiddleware)
    expect(app.use).toHaveBeenCalledWith(runtime.compressionMiddleware)
    expect(app.use).toHaveBeenCalledWith(runtime.jsonMiddleware)
    expect(app.use).toHaveBeenCalledWith({ type: 'statsLogger' })
    expect(app.use).toHaveBeenCalledWith(runtime.staticMiddlewares[0])
    expect(app.use).toHaveBeenCalledWith('/uploads', runtime.staticMiddlewares[1])
    expect(app.use).toHaveBeenCalledWith('/api', runtime.authRoutes)
    expect(app.use).toHaveBeenCalledWith('/api', runtime.bookmarkRoutes)
    expect(app.use).toHaveBeenCalledWith('/api', runtime.systemRoutes)
    expect(app.use).toHaveBeenCalledWith('/api', runtime.statsRoutes)
    expect(app.use).toHaveBeenCalledWith('/api-docs', swaggerServe, runtime.swaggerUiHandler)
    expect(swaggerSetup).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        customSiteTitle: 'StarNav API Documentation',
        swaggerOptions: {
          url: '/api-docs.json'
        }
      })
    )
    expect(getSwaggerSpec).not.toHaveBeenCalled()
    expect(app.use).toHaveBeenCalledWith({ type: 'errorHandler' })
    expect(module.default).toBe(app)
    await expect(module.createApp()).resolves.toBe(app)
    expect(init).toHaveBeenCalledTimes(1)

    const apiDocsHandler = app.get.mock.calls.find(([path]) => path === '/api-docs.json')[1]
    const fallbackHandler = app.get.mock.calls.find(([path]) => path === '/{*splat}')[1]
    const docsRes = {
      setHeader: vi.fn(),
      send: vi.fn()
    }
    const pageRes = {
      setHeader: vi.fn(),
      sendFile: vi.fn()
    }
    const staticHeaderRes = {
      setHeader: vi.fn()
    }

    await apiDocsHandler({}, docsRes, vi.fn())
    fallbackHandler({}, pageRes)
    runtime.staticMiddlewares[0].options.setHeaders(staticHeaderRes, '/tmp/dist/index.html')

    expect(getSwaggerSpec).toHaveBeenCalledTimes(1)
    expect(docsRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
    expect(docsRes.send).toHaveBeenCalledWith({ openapi: '3.0.0', info: { title: 'StarNav API' } })
    expect(pageRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache')
    expect(pageRes.sendFile).toHaveBeenCalledWith(expect.stringMatching(/dist[/\\]index\.html$/))
    expect(staticHeaderRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache')

    const buildRequest = (origin, { host = '127.0.0.1:38087', protocol = 'http' } = {}) => ({
      protocol,
      get: vi.fn((header) => {
        if (header === 'origin') return origin
        if (header === 'host') return host
        return undefined
      })
    })

    const callback = vi.fn()
    corsDelegate(buildRequest(null), callback)
    corsDelegate(buildRequest('chrome-extension://abc'), callback)
    corsDelegate(buildRequest('https://allowed.test'), callback)
    corsDelegate(buildRequest('http://127.0.0.1:38087'), callback)
    corsDelegate(buildRequest('https://evil.test'), callback)

    expect(callback).toHaveBeenNthCalledWith(
      1,
      null,
      expect.objectContaining({ origin: true, credentials: true })
    )
    expect(callback).toHaveBeenNthCalledWith(
      2,
      null,
      expect.objectContaining({ origin: true, credentials: false })
    )
    expect(callback).toHaveBeenNthCalledWith(
      3,
      null,
      expect.objectContaining({ origin: true, credentials: true })
    )
    expect(callback).toHaveBeenNthCalledWith(
      4,
      null,
      expect.objectContaining({ origin: true, credentials: true })
    )
    expect(callback.mock.calls[4][0]).toBeInstanceOf(Error)
    expect(callback.mock.calls[4][0].message).toBe('CORS not allowed')
    expect(logger.warn).toHaveBeenCalledWith('CORS 被拒绝', { origin: 'https://evil.test' })

    const server = await module.startServer(9090)
    expect(app.listen).toHaveBeenCalledWith(9090, expect.any(Function))
    expect(server.port).toBe(9090)
    expect(logger.info).toHaveBeenCalledWith('🚀 StarNav Server v9.9.9-test')
    expect(logger.info).toHaveBeenCalledWith('   Running on port 9090 in test mode')
  })

  it('enables trusted proxy mode only when explicitly configured', async () => {
    runtime = await loadServerModule({
      nodeEnv: 'test',
      trustProxy: 'true'
    })

    expect(runtime.app.set).toHaveBeenCalledWith('trust proxy', 1)
  })

  it('skips swagger ui registration in production', async () => {
    runtime = await loadServerModule({ nodeEnv: 'production' })

    const { app, logger, swaggerSetup, helmet } = runtime

    expect(swaggerSetup).not.toHaveBeenCalled()
    expect(app.use.mock.calls.some(([path]) => path === '/api-docs')).toBe(false)
    expect(helmet).toHaveBeenCalledWith(
      expect.objectContaining({
        contentSecurityPolicy: expect.objectContaining({
          directives: expect.not.objectContaining({
            upgradeInsecureRequests: []
          })
        })
      })
    )
    expect(helmet).toHaveBeenCalledWith(
      expect.objectContaining({
        contentSecurityPolicy: expect.objectContaining({
          directives: expect.objectContaining({
            upgradeInsecureRequests: null
          })
        })
      })
    )
    expect(logger.info).toHaveBeenCalledWith(
      '生产环境：Swagger UI 已禁用，仅提供 OpenAPI JSON 规范'
    )
  })

  it('serves the pre-generated OpenAPI json file in production when available', async () => {
    runtime = await loadServerModule({
      nodeEnv: 'production',
      staticOpenApiSpecAvailable: true
    })

    const { app, getSwaggerSpec, fsAccess } = runtime
    const apiDocsHandler = app.get.mock.calls.find(([path]) => path === '/api-docs.json')[1]
    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn()
    }

    await apiDocsHandler({}, res, vi.fn())

    expect(fsAccess).toHaveBeenCalledTimes(1)
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache')
    expect(res.sendFile).toHaveBeenCalledWith(expect.stringMatching(/dist[/\\]api-docs\.json$/))
    expect(getSwaggerSpec).not.toHaveBeenCalled()
  })

  it('does not fall back to localhost CORS allowlists in production', async () => {
    runtime = await loadServerModule({ nodeEnv: 'production' })

    const { corsDelegate } = runtime
    const buildRequest = (origin, { host = 'nav.example.com', protocol = 'https' } = {}) => ({
      protocol,
      get: vi.fn((header) => {
        if (header === 'origin') return origin
        if (header === 'host') return host
        return undefined
      })
    })

    const callback = vi.fn()
    corsDelegate(buildRequest('http://localhost:5173'), callback)
    corsDelegate(buildRequest('https://nav.example.com'), callback)

    expect(callback.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(callback.mock.calls[0][0].message).toBe('CORS not allowed')
    expect(callback).toHaveBeenNthCalledWith(
      2,
      null,
      expect.objectContaining({ origin: true, credentials: true })
    )
  })

  it('enables upgrade-insecure-requests only when explicitly configured', async () => {
    runtime = await loadServerModule({
      nodeEnv: 'production',
      cspUpgradeInsecureRequests: 'true'
    })

    const { helmet } = runtime

    expect(helmet).toHaveBeenCalledWith(
      expect.objectContaining({
        contentSecurityPolicy: expect.objectContaining({
          directives: expect.objectContaining({
            upgradeInsecureRequests: []
          })
        })
      })
    )
  })

  it('warns when swagger-ui-express is unavailable in non-production', async () => {
    runtime = await loadServerModule({ nodeEnv: 'development', swaggerUiAvailable: false })

    const { logger } = runtime

    expect(logger.warn).toHaveBeenCalledWith('Swagger UI 未启用: swagger-ui-express 模块未找到')
  })
})
