import { beforeEach, describe, expect, it, vi } from 'vitest'

const scheduleMock = vi.fn()
const backupDatabase = vi.fn()
const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}

vi.mock('node-cron', () => ({
  default: {
    schedule: scheduleMock
  }
}))

vi.mock('../../../src/server/services/database/database.js', () => ({
  backupDatabase
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger
}))

const { backupSchedulerService } =
  await import('../../../src/server/services/system/backupSchedulerService.js')

describe('BackupSchedulerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register the daily backup cron job', async () => {
    await backupSchedulerService.startAutoBackup()

    expect(scheduleMock).toHaveBeenCalledWith('0 2 * * *', expect.any(Function))
    expect(logger.info).toHaveBeenCalledWith('自动备份任务已启动（每天凌晨 2:00）')
  })

  it('should log successful backup execution when cron callback runs', async () => {
    backupDatabase.mockReturnValue({ success: true, path: '/tmp/starnav.db.bak' })
    await backupSchedulerService.startAutoBackup()

    const callback = scheduleMock.mock.calls[0][1]
    callback()

    expect(logger.info).toHaveBeenCalledWith('开始定时备份数据库')
    expect(logger.info).toHaveBeenCalledWith('定时备份成功: /tmp/starnav.db.bak')
  })
})
