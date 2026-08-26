import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createScopedLogger } from '../../clients/extension/common/logger.js'

describe('extension scoped logger', () => {
  let originalConsole

  beforeEach(() => {
    originalConsole = globalThis.console
    globalThis.console = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  })

  afterEach(() => {
    globalThis.console = originalConsole
    vi.restoreAllMocks()
  })

  it('formats the default scope prefix without a scope', () => {
    createScopedLogger().info('booted')
    expect(console.info).toHaveBeenCalledWith('[StarNav] booted')
  })

  it('prepends the scoped prefix to every log level', () => {
    const logger = createScopedLogger('options')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(console.debug).toHaveBeenCalledWith('[StarNav:options] d')
    expect(console.info).toHaveBeenCalledWith('[StarNav:options] i')
    expect(console.warn).toHaveBeenCalledWith('[StarNav:options] w')
    expect(console.error).toHaveBeenCalledWith('[StarNav:options] e')
  })

  it('passes extra metadata arguments through to the console', () => {
    createScopedLogger('api').info('request failed', { url: '/x' }, 500)
    expect(console.info).toHaveBeenCalledWith('[StarNav:api] request failed', { url: '/x' }, 500)
  })

  it('falls back to a no-op console when no global console exists', () => {
    delete globalThis.console
    expect(() => createScopedLogger('x').warn('ok')).not.toThrow()
  })
})
