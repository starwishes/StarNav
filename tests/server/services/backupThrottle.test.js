import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  backupDatabase: vi.fn()
}))

vi.mock('../../../src/server/services/database/database.js', () => ({
  backupDatabase: mocks.backupDatabase
}))

const { BACKUP_MIN_INTERVAL_MS, backupDatabaseThrottled, resetBackupThrottle } =
  await import('../../../src/server/services/database/backupThrottle.js')

describe('backupThrottle', () => {
  beforeEach(() => {
    resetBackupThrottle()
    mocks.backupDatabase.mockClear()
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
})
