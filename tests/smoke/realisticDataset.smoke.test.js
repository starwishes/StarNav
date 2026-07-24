// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { buildRealisticBookmarkDataset } from '../../src/server/tools/realisticBookmarkDataset.js'
import { cleanupTestDataDir, createTestDataDir } from '../setup/testDataDir.js'

const timedRequest = async (requestFactory) => {
  const startedAt = performance.now()
  const response = await requestFactory()

  return {
    status: response.status,
    durationMs: performance.now() - startedAt,
    body: response.body
  }
}

describe.sequential('Realistic dataset smoke without TCP binding', () => {
  let api
  let cleanupTestData
  let loginAsUser
  let unwrapResponseBody
  let systemHealthService
  let testDataDir

  beforeAll(async () => {
    vi.resetModules()

    testDataDir = createTestDataDir('starnav-realistic-smoke')
    process.env.ADMIN_PASSWORD = 'SmokeAdmin123!'
    process.env.CORS_ORIGINS = '*'
    process.env.LOG_LEVEL = '0'

    const helpers = await import('../setup/testHelpers.js')
    api = helpers.api
    cleanupTestData = helpers.cleanupTestData
    loginAsUser = helpers.loginAsUser
    unwrapResponseBody = helpers.unwrapResponseBody
    ;({ systemHealthService } = await import('../../src/server/services/system/systemHealthService.js'))
  })

  afterAll(async () => {
    delete process.env.ADMIN_PASSWORD
    delete process.env.CORS_ORIGINS

    await cleanupTestDataDir(testDataDir)
  })

  it('imports 100 realistic bookmarks and survives a mixed read/write simulation', async () => {
    cleanupTestData()

    const dataset = buildRealisticBookmarkDataset()
    const token = await loginAsUser()

    const importRes = await api
      .post('/api/data')
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'import',
        ...dataset
      })

    expect(importRes.status).toBe(200)
    expect(importRes.body.success).toBe(true)

    const dataRes = await api.get('/api/data').set('Authorization', `Bearer ${token}`)
    expect(dataRes.status).toBe(200)
    expect(unwrapResponseBody(dataRes.body)).toMatchObject({
      categories: expect.arrayContaining([expect.objectContaining({ name: '开发与代码' })]),
      items: expect.arrayContaining([expect.objectContaining({ name: 'GitHub' })])
    })
    expect(unwrapResponseBody(dataRes.body).categories).toHaveLength(10)
    expect(unwrapResponseBody(dataRes.body).items).toHaveLength(100)

    const searchRes = await api
      .get(`/api/bookmark/search?q=${encodeURIComponent('Git')}&limit=10`)
      .set('Authorization', `Bearer ${token}`)
    expect(searchRes.status).toBe(200)
    expect(unwrapResponseBody(searchRes.body).items.map((item) => item.name)).toEqual(
      expect.arrayContaining(['GitHub', 'GitLab'])
    )

    const categoriesRes = await api
      .get('/api/categories/simple')
      .set('Authorization', `Bearer ${token}`)
    expect(categoriesRes.status).toBe(200)
    expect(unwrapResponseBody(categoriesRes.body).categories).toHaveLength(10)

    const requestPlan = [
      ...Array.from(
        { length: 10 },
        () => () => timedRequest(() => api.get('/api/data').set('Authorization', `Bearer ${token}`))
      ),
      ...Array.from(
        { length: 8 },
        () => () =>
          timedRequest(() =>
            api
              .get(`/api/bookmark/search?q=${encodeURIComponent('cloud')}&limit=10`)
              .set('Authorization', `Bearer ${token}`)
          )
      ),
      ...Array.from(
        { length: 6 },
        () => () =>
          timedRequest(() =>
            api
              .get(`/api/bookmark/search?q=${encodeURIComponent('figma')}&limit=10`)
              .set('Authorization', `Bearer ${token}`)
          )
      ),
      ...Array.from(
        { length: 4 },
        () => () =>
          timedRequest(() =>
            api.get('/api/categories/simple').set('Authorization', `Bearer ${token}`)
          )
      ),
      ...Array.from(
        { length: 6 },
        (_, index) => () => timedRequest(() => api.post(`/api/sites/${index + 1}/click`))
      )
    ]

    const results = await Promise.all(requestPlan.map((runRequest) => runRequest()))
    const durations = results.map((result) => result.durationMs)
    const averageDurationMs =
      durations.reduce((total, duration) => total + duration, 0) / durations.length
    const maxDurationMs = Math.max(...durations)

    expect(results.every((result) => result.status === 200)).toBe(true)
    expect(averageDurationMs).toBeLessThan(200)
    expect(maxDurationMs).toBeLessThan(1000)

    const postSimulationDataRes = await api.get('/api/data').set('Authorization', `Bearer ${token}`)
    expect(postSimulationDataRes.status).toBe(200)

    const postSimulationData = unwrapResponseBody(postSimulationDataRes.body)
    const githubBookmark = postSimulationData.items.find((item) => item.id === 1)
    const jsdelivrBookmark = postSimulationData.items.find((item) => item.id === 6)

    expect(githubBookmark.clickCount).toBe(dataset.items[0].clickCount + 1)
    expect(jsdelivrBookmark.clickCount).toBe(dataset.items[5].clickCount + 1)

    const healthRes = await systemHealthService.getHealth()
    expect(healthRes.statusCode).toBe(200)
    expect(healthRes.body.data).toMatchObject({
      status: 'healthy',
      checks: {
        database: {
          ok: true
        }
      }
    })

    console.info(
      `[realistic-smoke] requests=${results.length} avg=${averageDurationMs.toFixed(2)}ms max=${maxDurationMs.toFixed(2)}ms`
    )
  })
})
