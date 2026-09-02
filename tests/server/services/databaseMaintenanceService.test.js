// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    copyFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn()
  }
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('../../../src/server/services/database/databaseBackupValidator.js', () => ({
  assertRestorableBackup: vi.fn()
}))

const fs = (await import('fs')).default
const { logger } = await import('../../../src/server/utils/logger.js')
const { assertRestorableBackup } =
  await import('../../../src/server/services/database/databaseBackupValidator.js')
const { databaseMaintenanceService } =
  await import('../../../src/server/services/database/databaseMaintenanceService.js')

describe('DatabaseMaintenanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fs.existsSync.mockReset()
    fs.copyFileSync.mockReset()
    fs.mkdirSync.mockReset()
    fs.rmSync.mockReset()
    assertRestorableBackup.mockReset()
  })
  it('should run a restart checkpoint', () => {
    const db = {
      pragma: vi.fn()
    }

    databaseMaintenanceService.forceCheckpoint(db)

    expect(db.pragma).toHaveBeenCalledWith('wal_checkpoint(RESTART)')
    expect(logger.debug).toHaveBeenCalledWith('数据库 Checkpoint (RESTART) 执行成功')
  })

  it('should swallow checkpoint errors and log them', () => {
    const error = new Error('checkpoint failed')
    const db = {
      pragma: vi.fn(() => {
        throw error
      })
    }

    databaseMaintenanceService.forceCheckpoint(db)

    expect(logger.error).toHaveBeenCalledWith('数据库 Checkpoint 失败', error)
  })

  it('should create a consistent backup via VACUUM INTO after checkpointing', () => {
    const checkpoint = vi.fn()
    const db = {
      exec: vi.fn()
    }
    fs.existsSync.mockReturnValue(true)

    const result = databaseMaintenanceService.backupDatabase({
      db,
      dbPath: '/tmp/starnav.db',
      checkpoint
    })

    expect(checkpoint).toHaveBeenCalled()
    expect(fs.rmSync).toHaveBeenCalledWith('/tmp/starnav.db.bak', { force: true })
    expect(db.exec).toHaveBeenCalledWith("VACUUM INTO '/tmp/starnav.db.bak'")
    expect(result).toEqual({
      success: true,
      code: 'BACKUP_OK',
      path: '/tmp/starnav.db.bak'
    })
  })

  it('should support custom backup output paths', () => {
    const checkpoint = vi.fn()
    const db = {
      exec: vi.fn()
    }
    fs.existsSync.mockReturnValue(true)

    const result = databaseMaintenanceService.backupDatabase({
      db,
      dbPath: '/tmp/starnav.db',
      checkpoint,
      outputPath: '/var/backups/starnav-1.db.bak'
    })

    expect(fs.mkdirSync).toHaveBeenCalledWith('/var/backups', { recursive: true })
    expect(db.exec).toHaveBeenCalledWith("VACUUM INTO '/var/backups/starnav-1.db.bak'")
    expect(result).toEqual({
      success: true,
      code: 'BACKUP_OK',
      path: '/var/backups/starnav-1.db.bak'
    })
  })

  it('should report missing database files without checkpointing', () => {
    const checkpoint = vi.fn()
    const db = {
      exec: vi.fn()
    }
    fs.existsSync.mockReturnValue(false)

    const result = databaseMaintenanceService.backupDatabase({
      db,
      dbPath: '/tmp/missing.db',
      checkpoint
    })

    expect(checkpoint).not.toHaveBeenCalled()
    expect(db.exec).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: false,
      code: 'BACKUP_FAILED',
      error: '数据库文件不存在'
    })
  })

  it('should report backup failures', () => {
    const checkpoint = vi.fn()
    const error = new Error('disk full')
    const db = {
      exec: vi.fn(() => {
        throw error
      })
    }
    fs.existsSync.mockReturnValue(true)

    const result = databaseMaintenanceService.backupDatabase({
      db,
      dbPath: '/tmp/starnav.db',
      checkpoint
    })

    expect(checkpoint).toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith('数据库备份失败', error)
    expect(result).toEqual({
      success: false,
      code: 'BACKUP_FAILED',
      error: 'disk full'
    })
  })

  it('should restore a database from backup and snapshot the current file', () => {
    fs.existsSync.mockImplementation((target) =>
      ['/tmp/starnav.db', '/tmp/backups/source.db.bak'].includes(target)
    )

    const result = databaseMaintenanceService.restoreDatabase({
      dbPath: '/tmp/starnav.db',
      backupPath: '/tmp/backups/source.db.bak',
      snapshotPath: '/tmp/backups/pre-restore.db.bak'
    })

    expect(assertRestorableBackup).toHaveBeenCalledWith('/tmp/backups/source.db.bak')
    expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/backups', { recursive: true })
    expect(fs.copyFileSync).toHaveBeenNthCalledWith(
      1,
      '/tmp/starnav.db',
      '/tmp/backups/pre-restore.db.bak'
    )
    expect(fs.rmSync).toHaveBeenCalledWith('/tmp/starnav.db-wal', { force: true })
    expect(fs.rmSync).toHaveBeenCalledWith('/tmp/starnav.db-shm', { force: true })
    expect(fs.copyFileSync).toHaveBeenNthCalledWith(
      2,
      '/tmp/backups/source.db.bak',
      '/tmp/starnav.db'
    )
    expect(result).toEqual({
      success: true,
      code: 'RESTORE_OK',
      path: '/tmp/starnav.db',
      previousBackupPath: '/tmp/backups/pre-restore.db.bak'
    })
  })

  it('should restore into a missing target database path without creating a snapshot', () => {
    fs.existsSync.mockImplementation((target) => target === '/tmp/backups/source.db.bak')

    const result = databaseMaintenanceService.restoreDatabase({
      dbPath: '/tmp/data/starnav.db',
      backupPath: '/tmp/backups/source.db.bak'
    })

    expect(assertRestorableBackup).toHaveBeenCalledWith('/tmp/backups/source.db.bak')
    expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/data', { recursive: true })
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      '/tmp/backups/source.db.bak',
      '/tmp/data/starnav.db'
    )
    expect(result).toEqual({
      success: true,
      code: 'RESTORE_OK',
      path: '/tmp/data/starnav.db',
      previousBackupPath: null
    })
  })

  it('should report missing backup files during restore', () => {
    fs.existsSync.mockReturnValue(false)

    const result = databaseMaintenanceService.restoreDatabase({
      dbPath: '/tmp/starnav.db',
      backupPath: '/tmp/missing.db.bak'
    })

    expect(assertRestorableBackup).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: false,
      code: 'RESTORE_FAILED',
      error: '备份文件不存在'
    })
    expect(fs.copyFileSync).not.toHaveBeenCalled()
  })

  it('should refuse to restore when the backup fails SQLite validation', () => {
    const validationError = new Error('备份文件完整性检查未通过: garbage')
    assertRestorableBackup.mockImplementation(() => {
      throw validationError
    })
    fs.existsSync.mockImplementation((target) => target === '/tmp/backups/source.db.bak')

    const result = databaseMaintenanceService.restoreDatabase({
      dbPath: '/tmp/starnav.db',
      backupPath: '/tmp/backups/source.db.bak'
    })

    expect(assertRestorableBackup).toHaveBeenCalledWith('/tmp/backups/source.db.bak')
    expect(fs.copyFileSync).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith('数据库恢复失败', validationError)
    expect(result).toEqual({
      success: false,
      code: 'RESTORE_FAILED',
      error: '备份文件完整性检查未通过: garbage'
    })
  })

  it('should report restore failures after snapshot preparation starts', () => {
    const error = new Error('copy failed')
    fs.existsSync.mockImplementation((target) =>
      ['/tmp/starnav.db', '/tmp/backups/source.db.bak'].includes(target)
    )
    fs.copyFileSync
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw error
      })

    const result = databaseMaintenanceService.restoreDatabase({
      dbPath: '/tmp/starnav.db',
      backupPath: '/tmp/backups/source.db.bak'
    })

    expect(logger.error).toHaveBeenCalledWith('数据库恢复失败', error)
    expect(result).toEqual({
      success: false,
      code: 'RESTORE_FAILED',
      error: 'copy failed'
    })
  })
})
