import { getDb } from '../../src/server/services/database/database.js'
import { accountService } from '../../src/server/services/identity/accountService.js'
import {
  authenticate,
  ensureTrustedCookieWriteOriginMiddleware,
  optionalAuth
} from '../../src/server/middleware/auth.js'
import { authController } from '../../src/server/controllers/authController.js'
import { bookmarkController } from '../../src/server/controllers/bookmarkController.js'
import { invalidateCache } from '../../src/server/services/bookmark/cache.js'
import { clickIpLimiter, clickLimiter } from '../../src/server/middleware/limiter.js'

const normalizeHeaders = (headers = {}) =>
  Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]))

/**
 * 集成测试路由表（受控近似，非生产路由全量镜像）。
 *
 * 局限说明：
 * - 仅覆盖集成测试实际用到的路由，且逐条手写 handler 链；新增/调整生产路由时
 *   必须同步本表（tests/server/routes/routeMounting.test.js 断言生产挂载链，可作对照）。
 * - 不包含 HTTP 层中间件（helmet/cors/body-parser/compression/静态文件与 SPA 回退），
 *   因此 cookie 写请求的 CORS 来源校验等"浏览器侧"行为不在本表体现。
 * - 点击计数路由的中间件链与生产保持完全一致（optionalAuth → origin 校验 →
 *   clickLimiter → clickIpLimiter → controller），防止被测链路与生产漂移。
 * - 全链路（真实 HTTP + 完整中间件）覆盖在 tests/smoke/runtime.smoke.test.js
 *   （启动真实 server 实例），本表定位为 controller+service 级集成，不重复起服务。
 */
const buildRouteTable = () => [
  {
    method: 'POST',
    pattern: /^\/api\/login$/,
    handlers: [authController.login]
  },
  {
    method: 'GET',
    pattern: /^\/api\/data$/,
    handlers: [optionalAuth, bookmarkController.getData]
  },
  {
    method: 'POST',
    pattern: /^\/api\/data$/,
    handlers: [authenticate, bookmarkController.saveData]
  },
  {
    method: 'POST',
    pattern: /^\/api\/bookmark$/,
    handlers: [authenticate, bookmarkController.addBookmark]
  },
  {
    method: 'GET',
    pattern: /^\/api\/bookmark\/check$/,
    handlers: [authenticate, bookmarkController.checkBookmark]
  },
  {
    method: 'GET',
    pattern: /^\/api\/bookmark\/search$/,
    handlers: [authenticate, bookmarkController.searchBookmarks]
  },
  {
    method: 'GET',
    pattern: /^\/api\/categories\/simple$/,
    handlers: [authenticate, bookmarkController.getSimpleCategories]
  },
  {
    method: 'POST',
    pattern: /^\/api\/category$/,
    handlers: [authenticate, bookmarkController.createCategory]
  },
  {
    method: 'PUT',
    pattern: /^\/api\/category\/([^/]+)$/,
    paramNames: ['id'],
    handlers: [authenticate, bookmarkController.updateCategory]
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/category\/([^/]+)$/,
    paramNames: ['id'],
    handlers: [authenticate, bookmarkController.deleteCategory]
  },
  {
    method: 'PUT',
    pattern: /^\/api\/bookmark\/([^/]+)$/,
    paramNames: ['id'],
    handlers: [authenticate, bookmarkController.updateBookmark]
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/bookmark\/([^/]+)$/,
    paramNames: ['id'],
    handlers: [authenticate, bookmarkController.deleteBookmark]
  },
  {
    method: 'POST',
    pattern: /^\/api\/sites\/([^/]+)\/click$/,
    paramNames: ['id'],
    handlers: [
      optionalAuth,
      ensureTrustedCookieWriteOriginMiddleware,
      clickLimiter,
      clickIpLimiter,
      bookmarkController.trackClick
    ]
  }
]

const resolveRoute = (method, pathname) => {
  for (const route of buildRouteTable()) {
    if (route.method !== method) {
      continue
    }

    const match = pathname.match(route.pattern)
    if (!match) {
      continue
    }

    const params = {}
    ;(route.paramNames || []).forEach((name, index) => {
      params[name] = match[index + 1]
    })

    return {
      handlers: route.handlers,
      params
    }
  }

  throw new Error(`未实现的测试路由: ${method} ${pathname}`)
}

const createResponseRecorder = () => {
  const result = {
    status: 200,
    body: undefined,
    headers: {}
  }

  let resolveDone
  const done = new Promise((resolve) => {
    resolveDone = resolve
  })

  const finalize = () => {
    res.headersSent = true
    resolveDone(result)
    return res
  }

  const res = {
    headersSent: false,
    status(code) {
      result.status = code
      return res
    },
    json(payload) {
      result.body = payload
      return finalize()
    },
    send(payload) {
      result.body = payload
      return finalize()
    },
    set(name, value) {
      result.headers[String(name).toLowerCase()] = value
      return res
    },
    setHeader(name, value) {
      result.headers[String(name).toLowerCase()] = value
    },
    getHeader(name) {
      return result.headers[String(name).toLowerCase()]
    }
  }

  return { res, done, result }
}

const runHandlers = async (handlers, req, res) => {
  const invoke = async (index) => {
    const handler = handlers[index]
    if (!handler || res.headersSent) {
      return
    }

    let nextPromise = null
    const next = (error) => {
      if (error) {
        return Promise.reject(error)
      }

      nextPromise = invoke(index + 1)
      return nextPromise
    }

    const maybePromise = handler(req, res, next)
    if (maybePromise && typeof maybePromise.then === 'function') {
      await maybePromise
    }

    if (nextPromise) {
      await nextPromise
    }
  }

  await invoke(0)
}

const executeRouteRequest = async ({ method, path, headers = {}, body }) => {
  const parsedUrl = new URL(path, 'http://localhost')
  const normalizedHeaders = normalizeHeaders(headers)
  const { handlers, params } = resolveRoute(method, parsedUrl.pathname)
  const { res, done, result } = createResponseRecorder()

  const req = {
    method,
    url: path,
    originalUrl: path,
    path: parsedUrl.pathname,
    params,
    query: Object.fromEntries(parsedUrl.searchParams.entries()),
    body,
    headers: normalizedHeaders,
    protocol: 'http',
    ip: '127.0.0.1',
    connection: {
      remoteAddress: '127.0.0.1'
    },
    get(name) {
      return normalizedHeaders[String(name).toLowerCase()]
    }
  }

  await runHandlers(handlers, req, res)

  if (!res.headersSent) {
    res.send(result.body)
  }

  return done
}

class ApiRequestBuilder {
  constructor(method, path) {
    this.method = method
    this.path = path
    this.headers = {}
    this.body = undefined
    this.execution = null
  }

  set(name, value) {
    this.headers[name] = value
    return this
  }

  send(body) {
    this.body = body
    return this.execute()
  }

  execute() {
    if (!this.execution) {
      this.execution = executeRouteRequest({
        method: this.method,
        path: this.path,
        headers: this.headers,
        body: this.body
      })
    }

    return this.execution
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected)
  }

  catch(onRejected) {
    return this.execute().catch(onRejected)
  }

  finally(onFinally) {
    return this.execute().finally(onFinally)
  }
}

/**
 * API 请求辅助函数
 */
export const api = {
  get: (path) => new ApiRequestBuilder('GET', path),
  post: (path) => new ApiRequestBuilder('POST', path),
  put: (path) => new ApiRequestBuilder('PUT', path),
  delete: (path) => new ApiRequestBuilder('DELETE', path),
  patch: (path) => new ApiRequestBuilder('PATCH', path)
}

export const unwrapResponseBody = (body) => {
  if (body && typeof body === 'object' && body.data !== undefined) {
    return body.data
  }

  return body
}

/**
 * 测试用户登录并获取 token
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<string>} - JWT token
 */
export async function loginAsUser(username = 'admin', password = 'admin123') {
  if (username === 'admin' && !accountService.verifyPassword(username, password)) {
    const testUser = 'testIntegrationUser'
    const testPass = 'testIntegrationPass123!'

    try {
      await createTestUser(testUser, testPass, 3)
      username = testUser
      password = testPass
    } catch (err) {
      console.error('无法创建集成测试用户:', err.message)
    }
  }

  const res = await api.post('/api/login').send({ username, password })

  if (res.status !== 200) {
    console.error(`登录请求失败 [${res.status}]:`, res.body)
    throw new Error(`登录失败，状态码: ${res.status}`)
  }

  const payload = unwrapResponseBody(res.body)

  if (!payload?.token) {
    throw new Error('登录失败，未返回 token')
  }

  return payload.token
}

/**
 * 创建测试用户
 */
export async function createTestUser(username, password, level = 1) {
  const db = getDb()
  const bcrypt = await import('bcryptjs')
  const hashedPassword = await bcrypt.hash(password, 10)

  const result = db
    .prepare('INSERT INTO users (username, password, level) VALUES (?, ?, ?)')
    .run(username, hashedPassword, level)

  invalidateCache()
  return {
    id: result.lastInsertRowid,
    username,
    level
  }
}

/**
 * 创建测试分类
 */
export async function createTestCategory(name, level = 0) {
  const db = getDb()
  const result = db.prepare('INSERT INTO categories (name, level) VALUES (?, ?)').run(name, level)

  invalidateCache()
  return {
    id: result.lastInsertRowid,
    name,
    level
  }
}

/**
 * 彻底重置测试数据库内容
 */
export function resetTestDatabase() {
  const db = getDb()
  try {
    db.prepare('DELETE FROM items').run()
    db.prepare('DELETE FROM categories').run()
    db.prepare('DELETE FROM users').run()
    db.prepare('DELETE FROM sessions').run()
    invalidateCache()
  } catch (err) {
    console.error('重置数据库失败:', err.message)
  }
}

/**
 * 清理测试数据
 * 在隔离环境下，直接执行全表重置
 */
export function cleanupTestData() {
  resetTestDatabase()
}

export function createTestBookmark(name, categoryId = 1, level = 0) {
  const db = getDb()

  const result = db
    .prepare(
      `INSERT INTO items (name, url, description, category_id, level)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      name,
      `https://${name}-${Date.now()}-${Math.floor(Math.random() * 1000)}.com`,
      `Test bookmark: ${name}`,
      categoryId,
      level
    )

  invalidateCache()
  return {
    id: result.lastInsertRowid,
    name,
    categoryId,
    level
  }
}

/**
 * 等待一段时间（用于测试异步操作）
 */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default {
  api,
  loginAsUser,
  createTestUser,
  cleanupTestData,
  createTestBookmark,
  wait
}
