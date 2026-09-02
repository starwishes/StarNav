// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'

const scheduleMock = vi.fn()
const backupDatabase = vi.fn()
const getDb = vi.fn()
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
  backupDatabase,
  getDb
}))

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger
}))

const { backupSchedulerService, pruneAuditLogs } =
  await import('../../../src/server/services/system/backupSchedulerService.js')

describe('BackupSchedulerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register the daily backup cron job', async () => {
    await backupSchedulerService.startAutoBackup()

    expect(scheduleMock).toHaveBeenCalledWith('0 2 * * *', expect.any(Function))
    expect(logger.info).toHaveBeenCalledWith('自动备份任务已启动（每天凌晨 2:00，保留最近 7 份）')
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

describe('pruneAuditLogs', () => {
  let db
  let dir

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starnav-audit-'))
    db = new Database(path.join(dir, 'audit.db'))
    db.exec(`
      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        action TEXT NOT NULL,
        details TEXT,
        ip TEXT,
        created_at TEXT
      )
    `)
  })

  afterEach(() => {
    db.close()
    fs.rmSync(dir, { recursive: true, force: true })
  })

  const countRows = () => db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count
  const insertLog = (createdAtExpr) =>
    db
      .prepare(
        `INSERT INTO audit_logs (username, action, created_at) VALUES ('admin', 'test', ${createdAtExpr})`
      )
      .run()

  it('deletes rows older than the retention window across both timestamp formats', () => {
    insertLog("datetime('now', '-100 days')")
    insertLog("strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-100 days')")
    insertLog("datetime('now', '-1 day')")

    const removed = pruneAuditLogs(db, { maxAgeDays: 90 })

    expect(removed).toBe(2)
    expect(countRows()).toBe(1)
  })

  it('caps the total row count to the max rows limit', () => {
    for (let i = 0; i < 12; i += 1) {
      insertLog("strftime('%Y-%m-%dT%H:%M:%fZ', 'now')")
    }

    const removed = pruneAuditLogs(db, { maxRows: 10 })

    expect(removed).toBe(2)
    expect(countRows()).toBe(10)
  })

  it('is a no-op when audit logs are within both limits', () => {
    insertLog("strftime('%Y-%m-%dT%H:%M:%fZ', 'now')")

    expect(pruneAuditLogs(db)).toBe(0)
    expect(countRows()).toBe(1)
  })
})
