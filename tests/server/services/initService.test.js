// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { logger } = vi.hoisted(() => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))

const prepareRuntime = vi.fn()
const initAdminAccount = vi.fn()
const initSettings = vi.fn()
const initDefaultData = vi.fn()
const startAutoBackup = vi.fn()
const getDb = vi.fn()
const runMigration = vi.fn()
const originalNodeEnv = process.env.NODE_ENV

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger
}))

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
  })

  it('should degrade gracefully when node-cron import fails and warn that scheduled cleanup is unavailable', async () => {
    process.env.NODE_ENV = 'development'
    // 模拟 backupSchedulerService 内部动态 import('node-cron') 失败：startAutoBackup 拒绝
    startAutoBackup.mockRejectedValue(new Error("Cannot find module 'node-cron'"))

    await expect(initService.init()).resolves.toBeUndefined()

    // 调度被尝试但失败 → 降级 warn，且明确提示定时清理不可用
    expect(startAutoBackup).toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('定时清理将不会执行'),
      expect.any(Error)
    )
    // 启动继续：后续初始化完成日志照常输出
    expect(logger.info).toHaveBeenCalledWith('系统初始化完成')
  })
})
