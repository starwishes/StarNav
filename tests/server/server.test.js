// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'node:path'

const createAppMock = () => ({
  set: vi.fn(),
  use: vi.fn(),
  get: vi.fn(),
  listen: vi.fn((port, callback) => {
    callback?.()
    return { close: vi.fn(), on: vi.fn(), port }
  })
})

const loadServerModule = async ({
  nodeEnv = 'test',
  corsOrigins,
  cspUpgradeInsecureRequests,
  trustProxy,
  apiDocsPublic,
  realClientIpHeader,
  swaggerUiAvailable = true,
  staticOpenApiSpecAvailable = false
} = {}) => {
  vi.resetModules()

  const originalNodeEnv = process.env.NODE_ENV
  const originalCorsOrigins = process.env.CORS_ORIGINS
  const originalCspUpgradeInsecureRequests = process.env.CSP_UPGRADE_INSECURE_REQUESTS
  const originalTrustProxy = process.env.TRUST_PROXY
  const originalApiDocsPublic = process.env.API_DOCS_PUBLIC
  const originalRealClientIpHeader = process.env.REAL_CLIENT_IP_HEADER

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
  if (apiDocsPublic === undefined) {
    delete process.env.API_DOCS_PUBLIC
  } else {
    process.env.API_DOCS_PUBLIC = apiDocsPublic
  }
  if (realClientIpHeader === undefined) {
    delete process.env.REAL_CLIENT_IP_HEADER
  } else {
    process.env.REAL_CLIENT_IP_HEADER = realClientIpHeader
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
  const closeDb = vi.fn()
  const forceCheckpoint = vi.fn()
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
  const fsAccess = vi.fn().mockImplementation(async () => {
    if (!staticOpenApiSpecAvailable) {
      throw new Error('missing')
    }
  })

  const authRoutes = { name: 'authRoutes' }
  const bookmarkRoutes = { name: 'bookmarkRoutes' }
  const systemRoutes = { name: 'systemRoutes' }

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
    TRUST_PROXY: trustProxy !== 'false',
    REAL_CLIENT_IP_HEADER: (realClientIpHeader || '').trim().toLowerCase(),
    UPLOADS_DIR: '/tmp/uploads'
  }))
  vi.doMock('../../src/server/middleware/errorHandler.js', () => ({
    errorHandler: { type: 'errorHandler' }
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
  vi.doMock('../../src/server/services/database/database.js', () => ({
    closeDb,
    forceCheckpoint
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
    closeDb,
    forceCheckpoint,
    fsAccess,
    authRoutes,
    bookmarkRoutes,
    systemRoutes,
    restoreEnv() {
      process.env.NODE_ENV = originalNodeEnv
      process.env.CORS_ORIGINS = originalCorsOrigins
      process.env.CSP_UPGRADE_INSECURE_REQUESTS = originalCspUpgradeInsecureRequests
      process.env.TRUST_PROXY = originalTrustProxy
      process.env.API_DOCS_PUBLIC = originalApiDocsPublic
      process.env.REAL_CLIENT_IP_HEADER = originalRealClientIpHeader
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

  // 用稳定函数名标记定位 IP 覆盖中间件，不依赖“第一个函数式 use/注册顺序”等启发式
  //（该中间件在 server.ts 中以 realClientIpOverride 命名注册，见 A6 加固）。
  const findIpOverrideMiddleware = (app) => {
    const call = app.use.mock.calls.find(
      (c) => typeof c[0] === 'function' && c[0].name === 'realClientIpOverride'
    )
    expect(call).toBeTruthy()
    return call[0]
  }

  it('assembles middleware, routes, swagger, and caches createApp()', async () => {
    runtime = await loadServerModule({
      nodeEnv: 'test',
      corsOrigins: 'https://allowed.test,https://second.test'
    })

    const { module, app, init, logger, corsDelegate, swaggerSetup, swaggerServe, getSwaggerSpec } =
      runtime

    expect(init).toHaveBeenCalledTimes(1)
    expect(app.set).toHaveBeenCalledWith('trust proxy', 1)
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
    expect(app.use).toHaveBeenCalledWith(runtime.staticMiddlewares[0])
    expect(app.use).toHaveBeenCalledWith('/uploads', runtime.staticMiddlewares[1])
    expect(app.use).toHaveBeenCalledWith('/api', runtime.authRoutes)
    expect(app.use).toHaveBeenCalledWith('/api', runtime.bookmarkRoutes)
    expect(app.use).toHaveBeenCalledWith('/api', runtime.systemRoutes)

    // 未匹配的 /api 请求应返回 JSON 404，而不是落入 SPA 回退
    const apiNotFoundHandler = app.use.mock.calls.find(
      ([path, handler]) => path === '/api' && typeof handler === 'function'
    )?.[1]
    const notFoundRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    apiNotFoundHandler({}, notFoundRes)
    expect(notFoundRes.status).toHaveBeenCalledWith(404)
    expect(notFoundRes.json).toHaveBeenCalledWith({
      success: false,
      error: '接口不存在',
      code: 'NOT_FOUND'
    })

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

    // dist/assets/* 指纹资源长缓存 immutable；/uploads 短缓存
    const assetHeaderRes = { setHeader: vi.fn() }
    const uploadHeaderRes = { setHeader: vi.fn() }
    runtime.staticMiddlewares[0].options.setHeaders(
      assetHeaderRes,
      path.join('/tmp/dist', 'assets', 'js', 'index-abc123.js')
    )
    runtime.staticMiddlewares[1].options.setHeaders(uploadHeaderRes, '/tmp/uploads/icon_123.png')

    expect(assetHeaderRes.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    )
    expect(uploadHeaderRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600')

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
    expect(callback.mock.calls[4][0]).toBeNull()
    expect(callback.mock.calls[4][1]).toEqual({ origin: false, credentials: false })
    expect(logger.warn).toHaveBeenCalledWith('CORS 被拒绝', { origin: 'https://evil.test' })

    const server = await module.startServer(9090)
    expect(app.listen).toHaveBeenCalledWith(9090, expect.any(Function))
    expect(server.port).toBe(9090)
    expect(logger.info).toHaveBeenCalledWith('🚀 StarNav Server v9.9.9-test')
    expect(logger.info).toHaveBeenCalledWith('   Running on port 9090 in test mode')
  })

  it('routes listen errors through graceful shutdown so checkpoint + closeDb still run', async () => {
    runtime = await loadServerModule({ nodeEnv: 'test' })

    const { module, app, logger } = runtime
    // 模拟 listen 未进入 listening 回调即报错（如 EADDRINUSE）：此时 serverRef 已赋 server
    // 但尚未监听成功，shutdown 的 close 会以 not-running 错误回调，随后照常走
    // finish（checkpoint + closeDb + exit(1)）
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})
    app.listen.mockImplementation((port) => ({
      port,
      // listen 失败后 server.close() 会以 "not running" 错误回调（真实 EADDRINUSE 路径）
      close: vi.fn((callback) => callback?.(new Error('Server is not running'))),
      on: vi.fn()
    }))

    const server = await module.startServer(9090)
    const errorHandler = server.on.mock.calls.find(([event]) => event === 'error')?.[1]
    expect(errorHandler).toBeTypeOf('function')

    errorHandler(new Error('EADDRINUSE: address already in use'))

    expect(logger.error).toHaveBeenCalledWith(
      '服务器启动失败',
      expect.objectContaining({ message: 'EADDRINUSE: address already in use' })
    )
    expect(logger.info).toHaveBeenCalledWith('收到 listen-error，开始优雅停机')
    expect(runtime.forceCheckpoint).toHaveBeenCalledTimes(1)
    expect(runtime.closeDb).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith('已优雅停机')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('trusts one reverse-proxy hop by default; TRUST_PROXY=false disables it', async () => {
    runtime = await loadServerModule({
      nodeEnv: 'test',
      trustProxy: 'false'
    })

    expect(runtime.app.set).toHaveBeenCalledWith('trust proxy', false)
  })

  it('always registers the real-client-IP override middleware', async () => {
    runtime = await loadServerModule({ nodeEnv: 'test' })
    const plainUses = runtime.app.use.mock.calls.filter(
      (call) => typeof call[0] === 'function' || typeof call[1] === 'function'
    )

    runtime = await loadServerModule({ nodeEnv: 'test', realClientIpHeader: 'cf-connecting-ip' })
    const headerUses = runtime.app.use.mock.calls.filter(
      (call) => typeof call[0] === 'function' || typeof call[1] === 'function'
    )

    // 显式 header 配置不改变注册数量（中间件恒在，内部双路逻辑处理两种形态）
    expect(headerUses.length).toBe(plainUses.length)
    expect(plainUses.length).toBeGreaterThan(0)
  })

  it('overrides req.ip from the configured REAL_CLIENT_IP_HEADER (first valid IP)', async () => {
    runtime = await loadServerModule({ nodeEnv: 'test', realClientIpHeader: 'cf-connecting-ip' })

    const middleware = findIpOverrideMiddleware(runtime.app)
    expect(middleware).toBeTypeOf('function')

    // 有效头：覆盖 req.ip 为首个 IP
    const reqWithHeader = {
      headers: { 'cf-connecting-ip': '203.0.113.7, 198.51.100.2' },
      socket: { remoteAddress: '104.16.1.2' },
      ip: '104.22.18.44'
    }
    const next = vi.fn()
    middleware(reqWithHeader, {}, next)
    expect(reqWithHeader.ip).toBe('203.0.113.7')
    expect(next).toHaveBeenCalledTimes(1)

    // 非法头值：回退 Express 既有解析（不改 req.ip）
    const reqBadHeader = {
      headers: { 'cf-connecting-ip': 'not-an-ip' },
      socket: { remoteAddress: '104.16.1.2' },
      ip: '172.70.207.146'
    }
    middleware(reqBadHeader, {}, next)
    expect(reqBadHeader.ip).toBe('172.70.207.146')
  })

  it('overrides req.ip on a real-Express-shaped request (prototype getter, no own ip)', async () => {
    runtime = await loadServerModule({ nodeEnv: 'test', realClientIpHeader: 'cf-connecting-ip' })

    const middleware = findIpOverrideMiddleware(runtime.app)
    expect(middleware).toBeTypeOf('function')

    // Express 5 用 defineGetter 把 req.ip 定义为原型 getter-only accessor
    //（lib/request.js:327，{ configurable, get } 无 setter），实例自身没有 own ip。
    // 直接赋值在 ESM 严格模式抛 "Cannot set property ip ... only a getter" → 500。
    // 早期测试用带 own 可写 ip 的 plain-object mock，永远复现不了该抛错——这里用
    // 与真实 IncomingMessage 同形态的对象驱动真实中间件，锁死 High 修复。
    const reqProto = {}
    Object.defineProperty(reqProto, 'ip', {
      configurable: true,
      get() {
        return '172.70.207.146'
      }
    })
    const req = Object.create(reqProto)
    req.headers = { 'cf-connecting-ip': '203.0.113.7' }
    req.socket = { remoteAddress: '104.16.1.2' }

    const next = vi.fn()
    expect(() => middleware(req, {}, next)).not.toThrow()
    expect(req.ip).toBe('203.0.113.7')
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('auto-trusts CF-Connecting-IP only when the socket peer is a Cloudflare edge', async () => {
    runtime = await loadServerModule({ nodeEnv: 'test' })

    const middleware = findIpOverrideMiddleware(runtime.app)
    expect(middleware).toBeTypeOf('function')

    // socket 对端在 CF 网段 + 合法 CF-Connecting-IP → 覆盖真实 IP
    const viaCf = {
      headers: { 'cf-connecting-ip': '203.0.113.7' },
      socket: { remoteAddress: '::ffff:104.23.251.5' },
      ip: '104.23.251.5'
    }
    middleware(viaCf, {}, vi.fn())
    expect(viaCf.ip).toBe('203.0.113.7')

    // 直连源站（socket 非 CF 网段）+ 伪造 CF-Connecting-IP → 不采信，保持原 IP
    const directHit = {
      headers: { 'cf-connecting-ip': '203.0.113.66' },
      socket: { remoteAddress: '198.51.100.10' },
      ip: '198.51.100.10'
    }
    middleware(directHit, {}, vi.fn())
    expect(directHit.ip).toBe('198.51.100.10')

    // CF 网段 socket 但无 CF-Connecting-IP → 不覆盖
    const viaCfNoHeader = {
      headers: {},
      socket: { remoteAddress: '172.70.207.146' },
      ip: '172.70.207.146'
    }
    middleware(viaCfNoHeader, {}, vi.fn())
    expect(viaCfNoHeader.ip).toBe('172.70.207.146')

    // 显式 REAL_CLIENT_IP_HEADER 与自动检测互斥：显式配置时只读指定头（不触发 CF 自动）
    runtime = await loadServerModule({ nodeEnv: 'test', realClientIpHeader: 'x-my-real-ip' })
    const explicitMiddleware = findIpOverrideMiddleware(runtime.app)
    const nonCfButHeader = {
      headers: { 'x-my-real-ip': '203.0.113.9', 'cf-connecting-ip': '203.0.113.8' },
      socket: { remoteAddress: '8.8.8.8' },
      ip: '8.8.8.8'
    }
    explicitMiddleware(nonCfButHeader, {}, vi.fn())
    expect(nonCfButHeader.ip).toBe('203.0.113.9')
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

    // 一次是 createConfiguredApp 启动时的 dist/index.html 存在性检查，另一次是 api-docs.json
    expect(fsAccess).toHaveBeenCalledTimes(2)
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache')
    expect(res.sendFile).toHaveBeenCalledWith(expect.stringMatching(/dist[/\\]api-docs\.json$/))
    expect(getSwaggerSpec).not.toHaveBeenCalled()
  })

  it('returns 404 for /api-docs.json in production without a static spec (no dev fallback import)', async () => {
    runtime = await loadServerModule({
      nodeEnv: 'production',
      staticOpenApiSpecAvailable: false
    })

    const { app, getSwaggerSpec } = runtime
    const apiDocsHandler = app.get.mock.calls.find(([path]) => path === '/api-docs.json')[1]
    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }

    await apiDocsHandler({}, res, vi.fn())

    // P1-5：生产无静态 spec 时直接 404，绝不动态 import devDependency swagger-jsdoc
    expect(getSwaggerSpec).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '接口不存在',
      code: 'NOT_FOUND'
    })
  })

  it('blocks anonymous /api-docs.json before static serving in production by default', async () => {
    runtime = await loadServerModule({ nodeEnv: 'production' })

    const { app } = runtime
    const blockCall = app.use.mock.calls.find(([path]) => path === '/api-docs.json')
    expect(blockCall).toBeTruthy()

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    blockCall[1]({}, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '接口不存在',
      code: 'NOT_FOUND'
    })
  })

  it('skips the /api-docs.json block when API_DOCS_PUBLIC=true in production', async () => {
    runtime = await loadServerModule({
      nodeEnv: 'production',
      apiDocsPublic: 'true',
      staticOpenApiSpecAvailable: true
    })

    const { app, getSwaggerSpec } = runtime
    expect(app.use.mock.calls.some(([path]) => path === '/api-docs.json')).toBe(false)

    const apiDocsHandler = app.get.mock.calls.find(([path]) => path === '/api-docs.json')[1]
    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn()
    }
    await apiDocsHandler({}, res, vi.fn())
    expect(res.sendFile).toHaveBeenCalledWith(expect.stringMatching(/dist[/\\]api-docs\.json$/))
    expect(getSwaggerSpec).not.toHaveBeenCalled()
  })

  it('keeps dynamic /api-docs.json generation in non-production without a static spec', async () => {
    runtime = await loadServerModule({
      nodeEnv: 'development',
      staticOpenApiSpecAvailable: false
    })

    const { app, getSwaggerSpec } = runtime
    expect(app.use.mock.calls.some(([path]) => path === '/api-docs.json')).toBe(false)

    const apiDocsHandler = app.get.mock.calls.find(([path]) => path === '/api-docs.json')[1]
    const res = {
      setHeader: vi.fn(),
      send: vi.fn()
    }
    await apiDocsHandler({}, res, vi.fn())
    expect(getSwaggerSpec).toHaveBeenCalledTimes(1)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
    expect(res.send).toHaveBeenCalledWith({ openapi: '3.0.0', info: { title: 'StarNav API' } })
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

    expect(callback.mock.calls[0][0]).toBeNull()
    expect(callback.mock.calls[0][1]).toEqual({ origin: false, credentials: false })
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
