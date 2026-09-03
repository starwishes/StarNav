// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { cleanupTestDataDir, createTestDataDir } from '../setup/testDataDir.js'

const buildPngDataUri = (width = 16, height = 16) => {
  const buffer = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52,
    (width >>> 24) & 0xff,
    (width >>> 16) & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    (height >>> 24) & 0xff,
    (height >>> 16) & 0xff,
    (height >>> 8) & 0xff,
    height & 0xff,
    0x08,
    0x02,
    0x00,
    0x00,
    0x00
  ])

  return `data:image/png;base64,${buffer.toString('base64')}`
}

const buildIcoDataUri = (width = 32, height = 32) => {
  const normalizedWidth = width === 256 ? 0 : width
  const normalizedHeight = height === 256 ? 0 : height
  const buffer = Buffer.from([
    0x00,
    0x00,
    0x01,
    0x00,
    0x01,
    0x00,
    normalizedWidth,
    normalizedHeight,
    0x00,
    0x00,
    0x01,
    0x00,
    0x20,
    0x00,
    0x10,
    0x00,
    0x00,
    0x00,
    0x16,
    0x00,
    0x00,
    0x00
  ])

  return `data:image/x-icon;base64,${buffer.toString('base64')}`
}

const readSetCookieHeader = (headers) => {
  if (typeof headers?.getSetCookie === 'function') {
    return headers.getSetCookie()[0] || ''
  }

  return headers?.get('set-cookie') || ''
}

const jsonRequest = async (url, { method = 'GET', token, cookie, origin, body, headers } = {}) => {
  const response = await fetch(url, {
    method,
    headers: {
      ...(headers || {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })

  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers
  }
}

describe.sequential('Runtime smoke tests', () => {
  let baseUrl
  let baseOrigin
  let server
  let testDataDir
  let token
  let authCookie

  beforeAll(async () => {
    vi.resetModules()

    testDataDir = createTestDataDir('starnav-smoke')
    process.env.ADMIN_PASSWORD = 'SmokeAdmin123!'
    process.env.CORS_ORIGINS = '*'
    process.env.LOG_LEVEL = '0'
    // 让 server.ts 的 IP 覆盖中间件进入"显式可信头"模式：测试请求携带该头时，
    // req.ip 会被覆盖（模拟 CDN 用专用头透传真实客户端 IP 的受支持部署形态）。
    // 注意：CF 自动检测（socket 对端 ∈ CF 官方网段才采信 CF-Connecting-IP）无法在
    // loopback 真机链路上复现（127.0.0.1 不在 CF 网段内），该门禁由 server.test.js
    // 的"auto-trusts ... only when socket peer is a CF edge"直调用例覆盖。
    process.env.REAL_CLIENT_IP_HEADER = 'x-smoke-client-ip'

    const { startServer } = await import('../../server.js')
    server = await startServer(0)
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    baseUrl = `http://127.0.0.1:${port}/api`
    baseOrigin = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      })
    }

    delete process.env.ADMIN_PASSWORD
    delete process.env.CORS_ORIGINS
    delete process.env.REAL_CLIENT_IP_HEADER

    await cleanupTestDataDir(testDataDir)
  })

  it('serves health and supports admin login', async () => {
    const health = await jsonRequest(`${baseUrl}/health`)
    expect(health.status).toBe(200)
    expect(health.body).toMatchObject({
      success: true,
      data: {
        status: 'healthy'
      }
    })

    const login = await jsonRequest(`${baseUrl}/login`, {
      method: 'POST',
      body: {
        username: 'admin',
        password: 'SmokeAdmin123!'
      }
    })

    expect(login.status).toBe(200)
    expect(login.body.data.token).toBeTruthy()
    token = login.body.data.token
    authCookie = readSetCookieHeader(login.headers)
    expect(authCookie).toContain('starnav_auth=')
    expect(authCookie).toContain('HttpOnly')
  })

  it('records the overridden real client IP in sessions and audit over real HTTP', async () => {
    // 真机链路（真实 TCP + 真实 DB）验证 IP 覆盖中间件的接线：login 携带受信客户端
    // IP 头（x-smoke-client-ip，见 beforeAll 的 REAL_CLIENT_IP_HEADER）时，新建会话与
    // 审计日志落库的 IP 都应是覆盖后的真实 IP，而非 socket 对端（127.0.0.1）。
    // 限流桶在 NODE_ENV=test 下恒 skip（见 middleware/limiter.ts），无法经 HTTP 观测
    // 计数键；此处断言会话/审计两个持久化消费方已真实打通，IP 键由 limiter 单测覆盖。
    const realClientIp = '203.0.113.77'

    const login = await jsonRequest(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'x-smoke-client-ip': realClientIp },
      body: { username: 'admin', password: 'SmokeAdmin123!' }
    })
    expect(login.status).toBe(200)
    const headerToken = login.body.data.token
    expect(headerToken).toBeTruthy()

    const sessionsRes = await jsonRequest(`${baseUrl}/sessions`, { token: headerToken })
    expect(sessionsRes.status).toBe(200)
    expect(sessionsRes.body.data.sessions).toEqual(
      expect.arrayContaining([expect.objectContaining({ ip: realClientIp })])
    )

    const auditRes = await jsonRequest(`${baseUrl}/admin/audit?limit=50`, { token })
    expect(auditRes.status).toBe(200)
    const loginLogs = auditRes.body.data.logs.filter(
      (log) => log.action === 'login' && log.username === 'admin'
    )
    expect(loginLogs[0]).toMatchObject({ ip: realClientIp })
  })

  it('rejects registration when disabled, then allows it once enabled', async () => {
    // 默认 registrationEnabled=false：真实路径下注册应被 403 拒绝
    const disabledRes = await jsonRequest(`${baseUrl}/register`, {
      method: 'POST',
      body: {
        username: `regdisabled${Date.now()}`,
        password: 'RegDisabledPass123!'
      }
    })
    expect(disabledRes.status).toBe(403)
    expect(disabledRes.body.code).toBe('FORBIDDEN')

    // 管理员开启注册
    const enableRes = await jsonRequest(`${baseUrl}/admin/settings`, {
      method: 'POST',
      cookie: authCookie,
      origin: baseOrigin,
      body: {
        registrationEnabled: true
      }
    })
    expect(enableRes.status).toBe(200)
    expect(enableRes.body.success).toBe(true)

    // 开启后注册建号成功，且新账号可登录
    const newUsername = `reguser${Date.now()}`
    const newPassword = 'RegUserPass123!'
    const registerRes = await jsonRequest(`${baseUrl}/register`, {
      method: 'POST',
      body: {
        username: newUsername,
        password: newPassword
      }
    })
    expect(registerRes.status).toBe(200)
    expect(registerRes.body.success).toBe(true)

    const loginRes = await jsonRequest(`${baseUrl}/login`, {
      method: 'POST',
      body: {
        username: newUsername,
        password: newPassword
      }
    })
    expect(loginRes.status).toBe(200)
    expect(loginRes.body.data.token).toBeTruthy()
  })

  it('supports category and bookmark CRUD with search round-trip', async () => {
    const categoryRes = await jsonRequest(`${baseUrl}/category`, {
      method: 'POST',
      token,
      body: {
        name: 'Smoke Category',
        icon: 'icon-folder'
      }
    })

    expect(categoryRes.status).toBe(200)
    const categoryId = categoryRes.body.data.item.id

    const bookmarkRes = await jsonRequest(`${baseUrl}/bookmark`, {
      method: 'POST',
      token,
      body: {
        name: 'Smoke Bookmark',
        url: 'https://smoke.example.com',
        description: 'runtime smoke bookmark',
        categoryId
      }
    })

    expect(bookmarkRes.status).toBe(200)
    const bookmarkId = bookmarkRes.body.data.item.id

    const searchRes = await jsonRequest(
      `${baseUrl}/bookmark/search?q=${encodeURIComponent('Smoke Bookmark')}&limit=10`,
      {
        token
      }
    )

    expect(searchRes.status).toBe(200)
    expect(searchRes.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: bookmarkId, categoryId })])
    )

    const updateCategoryRes = await jsonRequest(`${baseUrl}/category/${categoryId}`, {
      method: 'PUT',
      token,
      body: {
        name: 'Smoke Category Updated'
      }
    })

    expect(updateCategoryRes.status).toBe(200)
    expect(updateCategoryRes.body.data.item.name).toBe('Smoke Category Updated')

    const deleteBookmarkRes = await jsonRequest(`${baseUrl}/bookmark/${bookmarkId}`, {
      method: 'DELETE',
      token
    })

    expect(deleteBookmarkRes.status).toBe(200)
    expect(deleteBookmarkRes.body.success).toBe(true)
  })

  it('supports cookie-backed protected writes, uploads, and logout', async () => {
    const adminSettingsRes = await jsonRequest(`${baseUrl}/admin/settings`, {
      cookie: authCookie
    })
    expect(adminSettingsRes.status).toBe(200)
    expect(adminSettingsRes.body.success).toBe(true)

    const blockedWriteRes = await jsonRequest(`${baseUrl}/admin/settings`, {
      method: 'POST',
      cookie: authCookie,
      body: {
        siteName: 'Blocked Update'
      }
    })
    expect(blockedWriteRes.status).toBe(403)
    expect(blockedWriteRes.body.code).toBe('INVALID_REQUEST_ORIGIN')

    const updateSettingsRes = await jsonRequest(`${baseUrl}/admin/settings`, {
      method: 'POST',
      cookie: authCookie,
      origin: baseOrigin,
      body: {
        siteName: 'Runtime Smoke'
      }
    })
    expect(updateSettingsRes.status).toBe(200)
    expect(updateSettingsRes.body.success).toBe(true)

    const iconUploadRes = await jsonRequest(`${baseUrl}/upload-icon`, {
      method: 'POST',
      cookie: authCookie,
      origin: baseOrigin,
      body: {
        data: buildIcoDataUri()
      }
    })
    expect(iconUploadRes.status).toBe(200)
    expect(iconUploadRes.body.data.url).toMatch(/^\/uploads\/icon_.*\.ico$/)

    const backgroundUploadRes = await jsonRequest(`${baseUrl}/upload-background`, {
      method: 'POST',
      cookie: authCookie,
      origin: baseOrigin,
      body: {
        data: buildPngDataUri()
      }
    })
    expect(backgroundUploadRes.status).toBe(200)
    expect(backgroundUploadRes.body.data.url).toMatch(/^\/uploads\/bg_.*\.png$/)

    const logoutRes = await jsonRequest(`${baseUrl}/logout`, {
      method: 'POST',
      cookie: authCookie,
      origin: baseOrigin,
      body: {}
    })
    expect(logoutRes.status).toBe(200)
    expect(readSetCookieHeader(logoutRes.headers)).toContain('starnav_auth=')

    const revokedSessionRes = await jsonRequest(`${baseUrl}/admin/settings`, {
      cookie: authCookie
    })
    expect(revokedSessionRes.status).toBe(401)
    expect(revokedSessionRes.body.code).toBe('SESSION_INVALID')
  })
})
