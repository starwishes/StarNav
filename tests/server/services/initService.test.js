import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prepareRuntime = vi.fn()
const initAdminAccount = vi.fn()
const initSettings = vi.fn()
const initDefaultData = vi.fn()
const startAutoBackup = vi.fn()
const getDb = vi.fn()
const runMigration = vi.fn()
const warmup = vi.fn().mockResolvedValue(undefined)
const originalNodeEnv = process.env.NODE_ENV

vi.mock('../../../src/server/services/system/initRuntimeService.js', () => ({
  initRuntimeService: {
    prepareRuntime
  }
}))

vi.mock('../../../src/server/services/identity/adminBootstrapService.js', () => ({
  adminBootstrapService: {
    initAdminAccount
  }
}))

vi.mock('../../../src/server/services/system/bootstrapDefaultsService.js', () => ({
  bootstrapDefaultsService: {
    initSettings,
    initDefaultData
  }
}))

vi.mock('../../../src/server/services/system/backupSchedulerService.js', () => ({
  backupSchedulerService: {
    startAutoBackup
  }
}))

vi.mock('../../../src/server/services/database/database.js', () => ({
  getDb
}))

vi.mock('../../../src/server/services/migrate.js', () => ({
  runMigration
}))

vi.mock('../../../src/server/services/cache/cacheWarmupService.js', () => ({
  cacheWarmupService: {
    warmup
  }
}))

vi.mock('../../../src/server/services/cache/cacheService.js', () => ({
  default: { key: 'cache-service' }
}))

const { initService } = await import('../../../src/server/services/system/initService.js')

describe('initService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('should orchestrate startup using split bootstrap services outside test env', async () => {
    process.env.NODE_ENV = 'development'

    await initService.init()

    expect(prepareRuntime).toHaveBeenCalled()
    expect(getDb).toHaveBeenCalled()
    expect(runMigration).toHaveBeenCalled()
    expect(initAdminAccount).toHaveBeenCalled()
    expect(initSettings).toHaveBeenCalled()
    expect(initDefaultData).toHaveBeenCalled()
    expect(startAutoBackup).toHaveBeenCalled()
    expect(warmup).toHaveBeenCalledWith({ key: 'cache-service' })
  })

  it('should skip backup scheduler registration in test env', async () => {
    process.env.NODE_ENV = 'test'

    await initService.init()

    expect(prepareRuntime).toHaveBeenCalled()
    expect(getDb).toHaveBeenCalled()
    expect(runMigration).toHaveBeenCalled()
    expect(initAdminAccount).toHaveBeenCalled()
    expect(initSettings).toHaveBeenCalled()
    expect(initDefaultData).toHaveBeenCalled()
    expect(startAutoBackup).not.toHaveBeenCalled()
    expect(warmup).toHaveBeenCalledWith({ key: 'cache-service' })
  })
})
