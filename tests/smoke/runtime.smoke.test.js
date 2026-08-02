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
