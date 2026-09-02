// @vitest-environment node
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
const selectTimezoneGet = vi.fn()
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
  if (sql.includes('SELECT value FROM settings WHERE key =')) {
    return { get: selectTimezoneGet }
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

  it('should log the env timezone when seeding empty settings', () => {
    process.env.TZ = 'Asia/Shanghai'
    settingsCountGet.mockReturnValue({ count: 0 })

    bootstrapDefaultsService.initSettings()

    expect(insertSettingsRun).toHaveBeenCalledWith('timezone', '"Asia/Shanghai"')
    expect(logger.info).toHaveBeenCalledWith('已初始化默认系统设置（时区: Asia/Shanghai）')
  })

  it('should fill an empty timezone on an existing database from the environment', () => {
    process.env.TZ = 'America/New_York'
    settingsCountGet.mockReturnValue({ count: 5 })
    selectTimezoneGet.mockReturnValue({ value: '""' })

    bootstrapDefaultsService.initSettings()

    expect(insertSettingsRun).toHaveBeenCalledWith('timezone', '"America/New_York"')
    expect(logger.info).toHaveBeenCalledWith('已从环境变量写入空缺时区: America/New_York')
  })

  it('should leave an existing timezone untouched', () => {
    process.env.TZ = 'America/New_York'
    settingsCountGet.mockReturnValue({ count: 5 })
    selectTimezoneGet.mockReturnValue({ value: '"Asia/Shanghai"' })

    bootstrapDefaultsService.initSettings()

    expect(insertSettingsRun).not.toHaveBeenCalled()
  })

  it('should do nothing when existing settings and no env timezone', () => {
    delete process.env.TZ
    settingsCountGet.mockReturnValue({ count: 5 })
    selectTimezoneGet.mockReturnValue({ value: '""' })

    bootstrapDefaultsService.initSettings()

    expect(insertSettingsRun).not.toHaveBeenCalled()
    expect(selectTimezoneGet).not.toHaveBeenCalled()
  })

  it('should skip seeding default category and item when categories exist', () => {
    categoryCountGet.mockReturnValue({ count: 3 })

    bootstrapDefaultsService.initDefaultData()

    expect(insertCategoryRun).not.toHaveBeenCalled()
    expect(insertItemRun).not.toHaveBeenCalled()
  })
})
