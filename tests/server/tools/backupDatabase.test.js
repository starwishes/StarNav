// @vitest-environment node
import path from 'path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createExitError = (code) => {
  const error = new Error(`process.exit:${code}`)
  error.exitCode = code
  return error
}

describe('backupDatabase script', () => {
  const originalArgv = [...process.argv]
  const originalBackupOutputPath = process.env.BACKUP_OUTPUT_PATH

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-13T00:00:00.000Z'))
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw createExitError(code)
    })
    process.argv = ['node', 'backupDatabase.js']
    delete process.env.BACKUP_OUTPUT_PATH
  })

  afterEach(() => {
    process.argv = originalArgv
    if (originalBackupOutputPath === undefined) {
      delete process.env.BACKUP_OUTPUT_PATH
    } else {
      process.env.BACKUP_OUTPUT_PATH = originalBackupOutputPath
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('backs up the database to an explicit output path and closes the db afterwards', async () => {
    const getDb = vi.fn()
    const closeDb = vi.fn()
    const forceCheckpoint = vi.fn()
    const backupDatabase = vi.fn(() => ({
      success: true,
      path: '/tmp/backup/starnav.db.bak'
    }))

    vi.resetModules()
    process.argv = ['node', 'backupDatabase.js', '--output', './tmp/custom.db.bak']
    vi.doMock('../../../src/server/config/index.js', () => ({
      DATA_DIR: '/data'
    }))
    vi.doMock('../../../src/server/services/database/database.js', () => ({
      getDb,
      closeDb,
      forceCheckpoint
    }))
    vi.doMock('../../../src/server/services/database/databaseMaintenanceService.js', () => ({
      databaseMaintenanceService: {
        backupDatabase
      }
    }))
    vi.doMock('../../../src/server/services/database/databasePathService.js', () => ({
      databasePathService: {
        getDbPath: () => '/data/starnav.db'
      }
    }))

    await import('../../../src/server/tools/backupDatabase.js')

    expect(getDb).toHaveBeenCalledTimes(1)
    expect(backupDatabase).toHaveBeenCalledWith(
      expect.objectContaining({
        dbPath: '/data/starnav.db',
        checkpoint: forceCheckpoint,
        outputPath: path.resolve('./tmp/custom.db.bak')
      })
    )
    expect(console.log).toHaveBeenCalledWith('数据库路径: /data/starnav.db')
    expect(console.log).toHaveBeenCalledWith('备份文件: /tmp/backup/starnav.db.bak')
    expect(closeDb).toHaveBeenCalledTimes(1)
  })

  it('prints failures and exits with code 1 when the backup service reports an error', async () => {
    const closeDb = vi.fn()
    const backupDatabase = vi.fn(() => ({
      success: false,
      error: 'disk full'
    }))

    vi.resetModules()
    process.env.BACKUP_OUTPUT_PATH = '/tmp/backup/out.db.bak'
    vi.doMock('../../../src/server/config/index.js', () => ({
      DATA_DIR: '/data'
    }))
    vi.doMock('../../../src/server/services/database/database.js', () => ({
      getDb: vi.fn(),
      closeDb,
      forceCheckpoint: vi.fn()
    }))
    vi.doMock('../../../src/server/services/database/databaseMaintenanceService.js', () => ({
      databaseMaintenanceService: {
        backupDatabase
      }
    }))
    vi.doMock('../../../src/server/services/database/databasePathService.js', () => ({
      databasePathService: {
        getDbPath: () => '/data/starnav.db'
      }
    }))

    await expect(import('../../../src/server/tools/backupDatabase.js')).rejects.toMatchObject({
      exitCode: 1
    })

    expect(console.error).toHaveBeenCalledWith('数据库备份失败: disk full')
    expect(closeDb).toHaveBeenCalledTimes(1)
  })
})
