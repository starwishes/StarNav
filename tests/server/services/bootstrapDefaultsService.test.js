import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}

const settingsCountGet = vi.fn()
const categoryCountGet = vi.fn()
const insertSettingsRun = vi.fn()
const insertCategoryRun = vi.fn()
const insertItemRun = vi.fn()

const deleteLegacySettingsRun = vi.fn()

const prepareMock = vi.fn((sql) => {
  if (sql.includes('DELETE FROM settings WHERE key IN')) {
    return { run: deleteLegacySettingsRun }
  }
  if (sql.includes('SELECT COUNT(*) as count FROM settings')) {
    return { get: settingsCountGet }
  }
  if (sql.includes('INSERT OR REPLACE INTO settings')) {
    return { run: insertSettingsRun }
  }
  if (sql.includes('SELECT COUNT(*) as count FROM categories')) {
    return { get: categoryCountGet }
  }
  if (sql.includes('INSERT INTO categories')) {
    return { run: insertCategoryRun }
  }
  if (sql.includes('INSERT INTO items')) {
    return { run: insertItemRun }
  }
  throw new Error(`Unexpected SQL: ${sql}`)
})

vi.mock('../../../src/server/services/database/database.js', () => ({
  getDb: () => ({
    prepare: prepareMock
  })
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger
}))

const { bootstrapDefaultsService } =
  await import('../../../src/server/services/system/bootstrapDefaultsService.js')

describe('BootstrapDefaultsService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, NODE_ENV: 'development' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should initialize default settings when settings table is empty', () => {
    delete process.env.TZ
    settingsCountGet.mockReturnValue({ count: 0 })

    bootstrapDefaultsService.initSettings()

    expect(deleteLegacySettingsRun).toHaveBeenCalledWith('themePreset', 'themeColor')
    // registration/default level/background + empty timezone slot for env/display TZ
    expect(insertSettingsRun).toHaveBeenCalledTimes(4)
    expect(insertSettingsRun).toHaveBeenCalledWith('registrationEnabled', 'false')
    expect(insertSettingsRun).toHaveBeenCalledWith('defaultUserLevel', '1')
    expect(insertSettingsRun).toHaveBeenCalledWith('backgroundUrl', '""')
    expect(insertSettingsRun).toHaveBeenCalledWith('timezone', '""')
    expect(logger.info).toHaveBeenCalledWith('已初始化默认系统设置')
  })

  it('should initialize default category and bookmark when database is empty', () => {
    categoryCountGet.mockReturnValue({ count: 0 })

    bootstrapDefaultsService.initDefaultData()

    expect(insertCategoryRun).toHaveBeenCalled()
    expect(insertItemRun).toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('已创建默认分类和书签')
  })

  it('should skip default data initialization in test environment', () => {
    process.env = { ...originalEnv, NODE_ENV: 'test' }

    bootstrapDefaultsService.initDefaultData()

    expect(categoryCountGet).not.toHaveBeenCalled()
    expect(insertCategoryRun).not.toHaveBeenCalled()
  })
})
