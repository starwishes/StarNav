// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'

import { databasePathService } from '../../../src/server/services/database/databasePathService.js'

const originalNodeEnv = process.env.NODE_ENV
const originalWorkerId = process.env.VITEST_WORKER_ID

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
  process.env.VITEST_WORKER_ID = originalWorkerId
})

describe('DatabasePathService', () => {
  it('should build per-worker database paths in test mode', async () => {
    process.env.NODE_ENV = 'test'
    process.env.VITEST_WORKER_ID = '42'

    const dbPath = databasePathService.getDbPath()

    expect(dbPath).toMatch(/starnav-test-\d+-42\.db$/)
  })

  it('should use the production database path outside test mode', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.VITEST_WORKER_ID

    const dbPath = databasePathService.getDbPath()

    expect(dbPath).toMatch(/starnav\.db$/)
    expect(dbPath).not.toContain('starnav-test-')
  })
})
