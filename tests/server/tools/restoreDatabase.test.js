import path from 'path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createExitError = (code) => {
  const error = new Error(`process.exit:${code}`)
  error.exitCode = code
  return error
}

describe('restoreDatabase script', () => {
  const originalArgv = [...process.argv]
  const originalBackupPath = process.env.BACKUP_PATH

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-13T00:00:00.000Z'))
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw createExitError(code)
    })
    process.argv = ['node', 'restoreDatabase.js']
    delete process.env.BACKUP_PATH
  })

  afterEach(() => {
    process.argv = originalArgv
    if (originalBackupPath === undefined) {
      delete process.env.BACKUP_PATH
    } else {
      process.env.BACKUP_PATH = originalBackupPath
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('restores from a backup file and records the pre-restore snapshot path', async () => {
    const closeDb = vi.fn()
    const restoreDatabase = vi.fn(() => ({
      success: true,
      path: '/data/starnav.db',
      previousBackupPath: '/data/backups/pre-restore.db.bak'
    }))

    vi.resetModules()
    process.argv = ['node', 'restoreDatabase.js', '--from', './backups/latest.db.bak']
    vi.doMock('../../../src/server/config/index.js', () => ({
      DATA_DIR: '/data'
    }))
    vi.doMock('../../../src/server/services/database/database.js', () => ({
      closeDb
    }))
    vi.doMock('../../../src/server/services/database/databaseMaintenanceService.js', () => ({
      databaseMaintenanceService: {
        restoreDatabase
      }
    }))
    vi.doMock('../../../src/server/services/database/databasePathService.js', () => ({
      databasePathService: {
        getDbPath: () => '/data/starnav.db'
      }
    }))

    await import('../../../src/server/tools/restoreDatabase.js')

    expect(closeDb).toHaveBeenCalledTimes(1)
    expect(restoreDatabase).toHaveBeenCalledWith({
      dbPath: '/data/starnav.db',
      backupPath: path.resolve('./backups/latest.db.bak'),
      snapshotPath: path.join(
        '/data',
        'backups',
        'starnav-pre-restore-2026-04-13T00-00-00-000Z.db.bak'
      )
    })
    expect(console.log).toHaveBeenCalledWith('已恢复数据库: /data/starnav.db')
    expect(console.log).toHaveBeenCalledWith('恢复前快照: /data/backups/pre-restore.db.bak')
  })

  it('rejects restore requests that point back to the active database file', async () => {
    vi.resetModules()
    process.argv = ['node', 'restoreDatabase.js', '--from', '/data/starnav.db']
    vi.doMock('../../../src/server/config/index.js', () => ({
      DATA_DIR: '/data'
    }))
    vi.doMock('../../../src/server/services/database/database.js', () => ({
      closeDb: vi.fn()
    }))
    vi.doMock('../../../src/server/services/database/databaseMaintenanceService.js', () => ({
      databaseMaintenanceService: {
        restoreDatabase: vi.fn()
      }
    }))
    vi.doMock('../../../src/server/services/database/databasePathService.js', () => ({
      databasePathService: {
        getDbPath: () => '/data/starnav.db'
      }
    }))

    await expect(import('../../../src/server/tools/restoreDatabase.js')).rejects.toMatchObject({
      exitCode: 1
    })

    expect(console.error).toHaveBeenCalledWith('恢复源文件不能与当前数据库路径相同。')
  })
})
