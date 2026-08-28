import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  backupDatabase: vi.fn(),
  loggerError: vi.fn()
}))

vi.mock('../../../src/server/services/database/database.js', () => ({
  backupDatabase: mocks.backupDatabase
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: {
    error: mocks.loggerError,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}))

const {
  BACKUP_FAILURE_BACKOFF_MS,
  BACKUP_FORCE_MIN_INTERVAL_MS,
  BACKUP_MAX_CONSECUTIVE_FAILURES,
  BACKUP_MIN_INTERVAL_MS,
  backupDatabaseThrottled,
  resetBackupThrottle
} = await import('../../../src/server/services/database/backupThrottle.js')

describe('backupThrottle', () => {
  beforeEach(() => {
    resetBackupThrottle()
    mocks.backupDatabase.mockReset()
    mocks.backupDatabase.mockReturnValue({ success: true })
    mocks.loggerError.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('performs the first backup immediately', () => {
    expect(backupDatabaseThrottled()).toBe(true)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(1)
  })

  it('skips backups within the minimum interval', () => {
    expect(backupDatabaseThrottled()).toBe(true)

    // 同一时刻 / 阈值内的连续写操作不重复复制整库
    vi.advanceTimersByTime(BACKUP_MIN_INTERVAL_MS - 1)
    expect(backupDatabaseThrottled()).toBe(false)
    vi.advanceTimersByTime(0)
    expect(backupDatabaseThrottled()).toBe(false)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(1)
  })

  it('runs a real backup again once the interval has elapsed', () => {
    backupDatabaseThrottled()

    vi.advanceTimersByTime(BACKUP_MIN_INTERVAL_MS + 1)
    expect(backupDatabaseThrottled()).toBe(true)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(2)
  })

  it('keeps throttling after skipped calls (window is anchored to last real backup)', () => {
    backupDatabaseThrottled()

    // 多次被跳过的写操作不刷新备份窗口，也不顺延它
    for (let i = 0; i < 8; i++) {
      vi.advanceTimersByTime(600)
      backupDatabaseThrottled()
    }
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(1)

    // 距首次真实备份超过阈值后恢复备份
    vi.advanceTimersByTime(BACKUP_MIN_INTERVAL_MS + 200)
    expect(backupDatabaseThrottled()).toBe(true)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(2)
  })

  it('does not advance the window when a backup fails, retrying on the next write', () => {
    mocks.backupDatabase.mockReturnValueOnce({ success: false })

    expect(backupDatabaseThrottled()).toBe(false)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(1)

    // 失败不推进 lastBackupAt：即使仍在原窗口内，下一次写也应重试备份
    vi.advanceTimersByTime(100)
    expect(backupDatabaseThrottled()).toBe(true)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(2)
  })

  it('forces a backup when force=true, respecting only the shorter force interval', () => {
    backupDatabaseThrottled()
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(1)

    // force 在普通窗口内但未到 force 最小间隔(500ms)时仍然跳过
    vi.advanceTimersByTime(100)
    expect(backupDatabaseThrottled(true)).toBe(false)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(1)

    // 超过 force 最小间隔后 force 执行备份
    vi.advanceTimersByTime(BACKUP_FORCE_MIN_INTERVAL_MS)
    expect(backupDatabaseThrottled(true)).toBe(true)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(2)
  })

  it('does not advance the window when a forced backup fails, retrying on the next force', () => {
    backupDatabaseThrottled()

    mocks.backupDatabase.mockReturnValueOnce({ success: false })
    vi.advanceTimersByTime(BACKUP_FORCE_MIN_INTERVAL_MS + 1)
    expect(backupDatabaseThrottled(true)).toBe(false)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(2)

    // 失败不推进时间戳：再次 force 立即重试
    expect(backupDatabaseThrottled(true)).toBe(true)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(3)
  })

  it('backs off after consecutive failures, then recovers and logs an error once', () => {
    mocks.backupDatabase.mockReturnValue({ success: false })

    // 连续失败达到阈值后进入退避，且只告警一次
    expect(backupDatabaseThrottled()).toBe(false)
    vi.advanceTimersByTime(BACKUP_MIN_INTERVAL_MS + 1)
    expect(backupDatabaseThrottled()).toBe(false)
    vi.advanceTimersByTime(BACKUP_MIN_INTERVAL_MS + 1)
    expect(backupDatabaseThrottled()).toBe(false)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(BACKUP_MAX_CONSECUTIVE_FAILURES)
    expect(mocks.loggerError).toHaveBeenCalledTimes(1)

    // 退避窗口内不再重试
    vi.advanceTimersByTime(BACKUP_FAILURE_BACKOFF_MS - 1)
    expect(backupDatabaseThrottled()).toBe(false)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(BACKUP_MAX_CONSECUTIVE_FAILURES)

    // 退避窗口过后重试；成功后退出退避
    vi.advanceTimersByTime(1)
    mocks.backupDatabase.mockReturnValue({ success: true })
    expect(backupDatabaseThrottled()).toBe(true)
    expect(mocks.backupDatabase).toHaveBeenCalledTimes(BACKUP_MAX_CONSECUTIVE_FAILURES + 1)

    // 恢复后再次失败从 0 重新计数
    mocks.backupDatabase.mockReturnValue({ success: false })
    vi.advanceTimersByTime(BACKUP_MIN_INTERVAL_MS + 1)
    expect(backupDatabaseThrottled()).toBe(false)
    expect(mocks.loggerError).toHaveBeenCalledTimes(1)
  })
})
