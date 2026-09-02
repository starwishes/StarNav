// @vitest-environment node
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loadLoggerModule = async () => {
  vi.resetModules()
  return import('../../../src/server/utils/logger.js')
}

describe('logger', () => {
  const originalEnv = {
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_FILE: process.env.LOG_FILE,
    LOG_DIR: process.env.LOG_DIR,
    LOG_RETENTION_DAYS: process.env.LOG_RETENTION_DAYS
  }
  let tempLogDir = ''

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env.LOG_LEVEL = originalEnv.LOG_LEVEL
    process.env.LOG_FILE = originalEnv.LOG_FILE
    process.env.LOG_DIR = originalEnv.LOG_DIR
    process.env.LOG_RETENTION_DAYS = originalEnv.LOG_RETENTION_DAYS
    if (tempLogDir) {
      // 尽力清理临时目录；Windows 上文件句柄可能仍被占用，失败时交由系统临时目录回收
      try {
        rmSync(tempLogDir, { recursive: true, force: true })
      } catch {
        // ignore
      }
      tempLogDir = ''
    }
  })

  it('defaults to info level and skips debug output', async () => {
    delete process.env.LOG_LEVEL
    process.env.LOG_FILE = 'false'
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { logger } = await loadLoggerModule()

    logger.debug('hidden')
    logger.info('visible', { ok: true })
    logger.warn('warn')
    logger.error('error')

    expect(debugSpy).not.toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] \[INFO\] visible \{"ok":true\}$/)
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] \[WARN\] warn$/)
    )
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] \[ERROR\] error$/)
    )
  })

  it('emits debug logs at level 4', async () => {
    process.env.LOG_LEVEL = '4'
    process.env.LOG_FILE = 'false'
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    const { logger } = await loadLoggerModule()

    logger.debug('trace', { scope: 'db' })

    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] \[DEBUG\] trace \{"scope":"db"\}$/)
    )
  })

  it('suppresses everything at level 0', async () => {
    process.env.LOG_LEVEL = '0'
    process.env.LOG_FILE = 'false'
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { logger } = await loadLoggerModule()

    logger.debug('trace')
    logger.info('info')
    logger.warn('warn')
    logger.error('error')

    expect(debugSpy).not.toHaveBeenCalled()
    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('writes formatted entries to a date-rotated file when file logging is enabled', async () => {
    tempLogDir = mkdtempSync(join(tmpdir(), 'starnav-logger-'))
    process.env.LOG_FILE = 'true'
    process.env.LOG_DIR = tempLogDir
    process.env.LOG_LEVEL = '4'

    const { logger } = await loadLoggerModule()

    logger.info('file-visible', { scope: 'file' })
    logger.debug('file-trace')

    const files = readdirSync(tempLogDir)
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/^starnav-\d{4}-\d{2}-\d{2}\.log$/)

    const content = readFileSync(join(tempLogDir, files[0]), 'utf8')
    expect(content).toContain('[INFO] file-visible {"scope":"file"}')
    expect(content).toContain('[DEBUG] file-trace')
    expect(content.trimEnd().endsWith('[DEBUG] file-trace')).toBe(true)
  })
})
