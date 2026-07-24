import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loadLoggerModule = async () => {
  vi.resetModules()
  return import('../../../src/server/utils/logger.js')
}

describe('logger', () => {
  const originalLogLevel = process.env.LOG_LEVEL

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env.LOG_LEVEL = originalLogLevel
  })

  it('defaults to info level and skips debug output', async () => {
    delete process.env.LOG_LEVEL
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
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[INFO\] .+ - visible$/), {
      ok: true
    })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[WARN\] .+ - warn$/), {})
    expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[ERROR\] .+ - error$/), {})
  })

  it('emits debug logs at level 4', async () => {
    process.env.LOG_LEVEL = '4'
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    const { logger } = await loadLoggerModule()

    logger.debug('trace', { scope: 'db' })

    expect(debugSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[DEBUG\] .+ - trace$/), {
      scope: 'db'
    })
  })

  it('suppresses everything at level 0', async () => {
    process.env.LOG_LEVEL = '0'
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
})
