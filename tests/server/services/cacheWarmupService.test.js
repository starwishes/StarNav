import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAll = vi.fn()
const getDb = vi.fn()

vi.mock('../../../src/server/services/system/settingsService.js', () => ({
  settingsService: {
    getAll
  }
}))

vi.mock('../../../src/server/services/database/database.js', () => ({
  getDb
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

const { warmup } = await import('../../../src/server/services/cache/cacheWarmupService.js')
const { logger } = await import('../../../src/server/utils/logger.js')

describe('cacheWarmupService', () => {
  let cacheService
  let all
  let prepare

  beforeEach(() => {
    all = vi.fn()
    prepare = vi.fn(() => ({ all }))
    cacheService = {
      set: vi.fn()
    }
    vi.clearAllMocks()
    getAll.mockReturnValue({ siteName: 'StarNav' })
    getDb.mockReturnValue({
      prepare
    })
    all.mockReturnValue([{ id: 1, name: 'Dev' }])
  })

  it('should preload settings and categories', async () => {
    await warmup(cacheService)

    expect(getAll).toHaveBeenCalled()
    expect(getDb).toHaveBeenCalled()
    expect(prepare).toHaveBeenCalledWith('SELECT * FROM categories ORDER BY sort_order')
    expect(cacheService.set).toHaveBeenCalledWith('settings:all', { siteName: 'StarNav' }, 1800)
    expect(cacheService.set).toHaveBeenCalledWith('categories:all', [{ id: 1, name: 'Dev' }], 600)
    expect(logger.info).toHaveBeenCalledWith('缓存预热完成')
  })

  it('should swallow warmup errors and log them', async () => {
    getAll.mockImplementation(() => {
      throw new Error('boom')
    })

    await expect(warmup(cacheService)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalled()
  })
})
