import fs from 'fs'
import path from 'path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger
}))

describe('InitRuntimeService', () => {
  const originalEnv = process.env
  let initRuntimeService
  let testDataDir
  let uploadsDir

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    testDataDir = createTestDataDir('starnav-init-runtime-test')
    process.env.NODE_ENV = 'development'
    uploadsDir = path.join(testDataDir, 'uploads')
    ;({ initRuntimeService } = await import('../../../src/server/services/system/initRuntimeService.js'))
  })

  afterEach(async () => {
    await cleanupTestDataDir(testDataDir, { closeDatabase: false })
    process.env = originalEnv
  })

  it('should validate env and ensure runtime directories exist', () => {
    initRuntimeService.prepareRuntime()

    expect(logger.info).toHaveBeenCalledWith('✅ 环境变量校验通过')
    expect(fs.existsSync(testDataDir)).toBe(true)
    expect(fs.existsSync(uploadsDir)).toBe(true)
  })

  it('should warn when production cors origins are missing', () => {
    process.env = { ...originalEnv, NODE_ENV: 'production', CORS_ORIGINS: '' }

    initRuntimeService.prepareRuntime()

    expect(logger.warn).toHaveBeenCalled()
  })
})
