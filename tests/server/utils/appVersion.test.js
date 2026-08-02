import realFs from 'node:fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const expectedVersion = JSON.parse(
  realFs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8')
).version

const loadAppVersionModule = () => import('../../../src/server/utils/appVersion.js')

describe('appVersion utils', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock('fs')
  })

  it('reads and exports the package version by default', async () => {
    const module = await loadAppVersionModule()

    expect(module.readAppVersion()).toBe(expectedVersion)
    expect(module.APP_VERSION).toBe(expectedVersion)
  })

  it('falls back when package.json does not exist', async () => {
    vi.doMock('fs', () => ({
      default: {
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn()
      }
    }))

    const module = await loadAppVersionModule()

    expect(module.readAppVersion()).toBe('0.0.0')
    expect(module.APP_VERSION).toBe('0.0.0')
  })

  it('falls back when package.json is invalid or missing a version', async () => {
    vi.doMock('fs', () => ({
      default: {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue('{bad-json')
      }
    }))

    const invalidModule = await loadAppVersionModule()
    expect(invalidModule.readAppVersion()).toBe('0.0.0')
  })

  it('falls back when package.json exists but does not expose a version string', async () => {
    vi.doMock('fs', () => ({
      default: {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue('{}')
      }
    }))

    const module = await loadAppVersionModule()

    expect(module.readAppVersion()).toBe('0.0.0')
  })
})
