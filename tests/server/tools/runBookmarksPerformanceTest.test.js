// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  spawnSync: vi.fn()
}))

vi.mock('child_process', () => ({
  spawnSync: (...args) => mocks.spawnSync(...args),
  default: {
    spawnSync: (...args) => mocks.spawnSync(...args)
  }
}))

const createExitError = (code) => {
  const error = new Error(`process.exit:${code}`)
  error.exitCode = code
  return error
}

describe('runBookmarksPerformanceTest script', () => {
  const originalArgv = [...process.argv]
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.resetModules()
    mocks.spawnSync.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw createExitError(code)
    })
    process.argv = ['node', 'runBookmarksPerformanceTest.js']
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: originalPlatform
    })
  })

  afterEach(() => {
    process.argv = originalArgv
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: originalPlatform
    })
    vi.restoreAllMocks()
  })

  it('uses a local k6 binary when available', async () => {
    mocks.spawnSync.mockReturnValueOnce({ status: 0 }).mockReturnValueOnce({ status: 0 })
    process.argv = [
      'node',
      'runBookmarksPerformanceTest.js',
      'tests/performance/bookmarks-mixed-load.js'
    ]

    await expect(
      import('../../../src/server/tools/runBookmarksPerformanceTest.js')
    ).rejects.toMatchObject({
      exitCode: 0
    })

    expect(mocks.spawnSync).toHaveBeenNthCalledWith(1, 'k6', ['version'], expect.any(Object))
    expect(mocks.spawnSync).toHaveBeenNthCalledWith(
      2,
      'k6',
      ['run', 'tests/performance/bookmarks-mixed-load.js'],
      expect.any(Object)
    )
  })

  it('prints a helpful error when neither local k6 nor docker fallback is available', async () => {
    mocks.spawnSync.mockReturnValueOnce({ status: 1 }).mockImplementation(() => ({
      error: {
        code: 'ENOENT'
      }
    }))

    await expect(
      import('../../../src/server/tools/runBookmarksPerformanceTest.js')
    ).rejects.toMatchObject({
      exitCode: 1
    })

    expect(console.error).toHaveBeenCalledWith(
      process.platform === 'linux'
        ? '未检测到本机 k6，且当前环境也不可用 docker。请先安装其中之一。'
        : '未检测到本机 k6；当前 Docker fallback 仅对 Linux/WSL 默认开放。请先安装 k6。'
    )
  })
})
