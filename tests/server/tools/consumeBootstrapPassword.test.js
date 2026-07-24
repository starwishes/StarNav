import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loadScript = async (record) => {
  vi.resetModules()
  vi.doMock('../../../src/server/services/identity/adminBootstrapService.js', () => ({
    consumeBootstrapPasswordFile: vi.fn(() => record)
  }))

  return import('../../../src/server/tools/consumeBootstrapPassword.js')
}

const createExitError = (code) => {
  const error = new Error(`process.exit:${code}`)
  error.exitCode = code
  return error
}

describe('consumeBootstrapPassword script', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw createExitError(code)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints the one-time bootstrap password details when a record exists', async () => {
    await loadScript({
      username: 'admin',
      password: 'secret-pass',
      generatedAt: '2026-04-13T12:00:00.000Z',
      expiresAt: '2026-04-13T12:10:00.000Z'
    })

    expect(console.log).toHaveBeenCalledWith('管理员账户: admin')
    expect(console.log).toHaveBeenCalledWith('初始密码: secret-pass')
    expect(console.log).toHaveBeenCalledWith('生成时间: 2026-04-13T12:00:00.000Z')
    expect(console.log).toHaveBeenCalledWith('过期时间: 2026-04-13T12:10:00.000Z')
    expect(console.log).toHaveBeenCalledWith('密码文件已在本次读取后删除。')
    expect(process.exit).not.toHaveBeenCalled()
  })

  it('exits with code 1 when no bootstrap password file is available', async () => {
    await expect(loadScript(null)).rejects.toMatchObject({
      exitCode: 1
    })

    expect(console.error).toHaveBeenCalledWith(
      '未找到有效的管理员初始密码文件，可能已过期、已被读取，或从未生成。'
    )
  })
})
