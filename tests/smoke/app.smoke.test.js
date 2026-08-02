// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { cleanupTestDataDir, createTestDataDir } from '../setup/testDataDir.js'

describe.sequential('App smoke tests without TCP binding', () => {
  let api
  let cleanupTestData
  let createTestCategory
  let loginAsUser
  let unwrapResponseBody
  let testDataDir

  beforeAll(async () => {
    vi.resetModules()

    testDataDir = createTestDataDir('starnav-app-smoke')
    process.env.ADMIN_PASSWORD = 'SmokeAdmin123!'
    process.env.CORS_ORIGINS = '*'
    process.env.LOG_LEVEL = '0'

    const helpers = await import('../setup/testHelpers.js')
    api = helpers.api
    cleanupTestData = helpers.cleanupTestData
    createTestCategory = helpers.createTestCategory
    loginAsUser = helpers.loginAsUser
    unwrapResponseBody = helpers.unwrapResponseBody
  })

  afterAll(async () => {
    delete process.env.ADMIN_PASSWORD
    delete process.env.CORS_ORIGINS

    await cleanupTestDataDir(testDataDir)
  })

  it('supports login plus bookmark CRUD through the no-port request harness', async () => {
    cleanupTestData()

    const rootCategory = await createTestCategory('Smoke Root')
    const token = await loginAsUser()
    const bookmarkName = `Smoke Bookmark ${Date.now()}`

    const dataRes = await api.get('/api/data').set('Authorization', `Bearer ${token}`)
    expect(dataRes.status).toBe(200)
    expect(unwrapResponseBody(dataRes.body)).toMatchObject({
      categories: expect.any(Array),
      items: expect.any(Array)
    })

    const categoryRes = await api
      .post('/api/category')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Smoke Child',
        icon: 'icon-folder',
        parentId: rootCategory.id
      })

    expect(categoryRes.status).toBe(200)
    const categoryId = unwrapResponseBody(categoryRes.body).item.id

    const bookmarkRes = await api
      .post('/api/bookmark')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: bookmarkName,
        url: `https://smoke-${Date.now()}.example.com`,
        description: 'no-port smoke bookmark',
        categoryId
      })

    expect(bookmarkRes.status).toBe(200)
    const bookmarkId = unwrapResponseBody(bookmarkRes.body).item.id

    const searchRes = await api
      .get(`/api/bookmark/search?q=${encodeURIComponent(bookmarkName)}&limit=10`)
      .set('Authorization', `Bearer ${token}`)

    expect(searchRes.status).toBe(200)
    expect(unwrapResponseBody(searchRes.body).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: bookmarkId, categoryId })])
    )

    const deleteRes = await api
      .delete(`/api/bookmark/${bookmarkId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.success).toBe(true)
  })
})
