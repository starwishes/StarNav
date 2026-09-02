// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const logger = {
  info: vi.fn()
}

const getDbPath = vi.fn(() => '/tmp/starnav.db')
const initSchema = vi.fn()
const forceCheckpointImpl = vi.fn()
const backupDatabaseImpl = vi.fn()
const getDbStatsImpl = vi.fn()
const close = vi.fn()
const pragma = vi.fn()
const prepare = vi.fn(() => ({ all: vi.fn(), get: vi.fn(), run: vi.fn() }))
const exec = vi.fn()
const databaseInstance = {
  pragma,
  close,
  prepare,
  exec
}
const Database = vi.fn(function Database() {
  return databaseInstance
})

const loadDatabaseModule = async () => {
  vi.resetModules()
  vi.doMock('better-sqlite3', () => ({
    default: Database
  }))
  vi.doMock('../../../src/server/utils/logger.js', () => ({
    logger
  }))
  vi.doMock('../../../src/server/services/database/databasePathService.js', () => ({
    databasePathService: {
      getDbPath
    }
  }))
  vi.doMock('../../../src/server/services/database/databaseSchemaService.js', () => ({
    databaseSchemaService: {
      initSchema
    }
  }))
  vi.doMock('../../../src/server/services/database/databaseMaintenanceService.js', () => ({
    databaseMaintenanceService: {
      forceCheckpoint: forceCheckpointImpl,
      backupDatabase: backupDatabaseImpl
    }
  }))
  vi.doMock('../../../src/server/services/database/databaseStatsService.js', () => ({
    databaseStatsService: {
      getDbStats: getDbStatsImpl
    }
  }))

  return import('../../../src/server/services/database/database.js')
}

describe('database runtime facade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates the sqlite connection lazily and reuses the singleton', async () => {
    const database = await loadDatabaseModule()

    const first = database.getDb()
    const second = database.getDb()

    expect(first).toBe(databaseInstance)
    expect(second).toBe(databaseInstance)
    expect(Database).toHaveBeenCalledTimes(1)
    expect(Database).toHaveBeenCalledWith('/tmp/starnav.db')
    expect(pragma).toHaveBeenNthCalledWith(1, 'journal_mode = WAL')
    expect(pragma).toHaveBeenNthCalledWith(2, 'synchronous = NORMAL')
    expect(pragma).toHaveBeenNthCalledWith(3, 'cache_size = -8000')
    expect(pragma).toHaveBeenNthCalledWith(4, 'busy_timeout = 5000')
    expect(pragma).toHaveBeenNthCalledWith(5, 'foreign_keys = ON')
    expect(initSchema).toHaveBeenCalledWith(databaseInstance)
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('SQLite 数据库已连接: /tmp/starnav.db')
    )
  })

  it('delegates checkpoint, backup, stats, and close to the split services', async () => {
    backupDatabaseImpl.mockReturnValue({ success: true, path: '/tmp/starnav.db.bak' })
    getDbStatsImpl.mockReturnValue({ size: 12 })

    const database = await loadDatabaseModule()
    database.getDb()

    database.forceCheckpoint()
    expect(forceCheckpointImpl).toHaveBeenCalledWith(databaseInstance)

    const backupResult = database.backupDatabase()
    const backupArgs = backupDatabaseImpl.mock.calls[0][0]
    expect(backupResult).toEqual({ success: true, path: '/tmp/starnav.db.bak' })
    expect(backupArgs.dbPath).toBe('/tmp/starnav.db')
    backupArgs.checkpoint()
    expect(forceCheckpointImpl).toHaveBeenCalledTimes(2)

    expect(database.getDbStats()).toEqual({ size: 12 })
    expect(getDbStatsImpl).toHaveBeenCalledWith(databaseInstance, '/tmp/starnav.db')

    database.closeDb()
    expect(close).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith('数据库连接已关闭')
  })

  it('backs up using the resolved db path before initialization and no-ops close without a db', async () => {
    backupDatabaseImpl.mockReturnValue({ success: true, path: '/tmp/starnav.db.bak' })

    const database = await loadDatabaseModule()

    database.closeDb()
    expect(close).not.toHaveBeenCalled()

    database.backupDatabase()
    expect(backupDatabaseImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        dbPath: '/tmp/starnav.db',
        checkpoint: expect.any(Function)
      })
    )
  })
})
