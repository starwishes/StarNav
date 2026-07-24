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

const fs = (await import('fs')).default
const { logger } = await import('../../../src/server/utils/logger.js')
const { databaseMaintenanceService } =
  await import('../../../src/server/services/database/databaseMaintenanceService.js')

describe('DatabaseMaintenanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fs.existsSync.mockReset()
    fs.copyFileSync.mockReset()
    fs.mkdirSync.mockReset()
    fs.rmSync.mockReset()
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

  it('should create a backup after checkpointing the current database file', () => {
    const checkpoint = vi.fn()
    fs.existsSync.mockReturnValue(true)

    const result = databaseMaintenanceService.backupDatabase({
      dbPath: '/tmp/starnav.db',
      checkpoint
    })

    expect(checkpoint).toHaveBeenCalled()
    expect(fs.copyFileSync).toHaveBeenCalledWith('/tmp/starnav.db', '/tmp/starnav.db.bak')
    expect(result).toEqual({
      success: true,
      path: '/tmp/starnav.db.bak'
    })
  })

  it('should support custom backup output paths', () => {
    const checkpoint = vi.fn()
    fs.existsSync.mockReturnValue(true)

    const result = databaseMaintenanceService.backupDatabase({
      dbPath: '/tmp/starnav.db',
      checkpoint,
      outputPath: '/var/backups/starnav-1.db.bak'
    })

    expect(fs.mkdirSync).toHaveBeenCalledWith('/var/backups', { recursive: true })
    expect(fs.copyFileSync).toHaveBeenCalledWith('/tmp/starnav.db', '/var/backups/starnav-1.db.bak')
    expect(result).toEqual({
      success: true,
      path: '/var/backups/starnav-1.db.bak'
    })
  })

  it('should report missing database files without checkpointing', () => {
    const checkpoint = vi.fn()
    fs.existsSync.mockReturnValue(false)

    const result = databaseMaintenanceService.backupDatabase({
      dbPath: '/tmp/missing.db',
      checkpoint
    })

    expect(checkpoint).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: false,
      error: '数据库文件不存在'
    })
  })

  it('should report backup copy failures', () => {
    const checkpoint = vi.fn()
    const error = new Error('disk full')
    fs.existsSync.mockReturnValue(true)
    fs.copyFileSync.mockImplementation(() => {
      throw error
    })

    const result = databaseMaintenanceService.backupDatabase({
      dbPath: '/tmp/starnav.db',
      checkpoint
    })

    expect(checkpoint).toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith('数据库备份失败', error)
    expect(result).toEqual({
      success: false,
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

    expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/data', { recursive: true })
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      '/tmp/backups/source.db.bak',
      '/tmp/data/starnav.db'
    )
    expect(result).toEqual({
      success: true,
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

    expect(result).toEqual({
      success: false,
      error: '备份文件不存在'
    })
    expect(fs.copyFileSync).not.toHaveBeenCalled()
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
      error: 'copy failed'
    })
  })
})
