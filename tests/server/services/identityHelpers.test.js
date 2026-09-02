// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/services/identity/accountService.js', () => ({
  accountService: {
    findByUsername: vi.fn()
  }
}))

vi.mock('../../../src/server/validation.js', () => ({
  strongPasswordSchema: {
    validate: vi.fn()
  }
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn()
  }
}))

const { accountService } = await import('../../../src/server/services/identity/accountService.js')
const { strongPasswordSchema } = await import('../../../src/server/validation.js')
const jwt = (await import('jsonwebtoken')).default
const { buildAuthUser, ensureExistingUser, ensureStrongPassword, issueToken } =
  await import('../../../src/server/services/identity/identityHelpers.js')

describe('identityHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    strongPasswordSchema.validate.mockReturnValue({ error: null })
  })

  it('builds the existing auth user payload shape', () => {
    expect(
      buildAuthUser({
        username: 'alice',
        level: 2,
        ignored: true
      })
    ).toEqual({
      login: 'alice',
      name: 'alice',
      level: 2
    })
  })

  it('issues tokens with the current claims and optional session id', () => {
    jwt.sign.mockReturnValue('token-1')

    expect(issueToken({ username: 'alice', level: 2 }, 'session-1')).toBe('token-1')
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        username: 'alice',
        level: 2,
        authVersion: 0,
        sessionId: 'session-1'
      },
      expect.any(String),
      { expiresIn: '7d' }
    )

    issueToken({ username: 'bob', level: 1 })
    expect(jwt.sign).toHaveBeenLastCalledWith(
      {
        username: 'bob',
        level: 1,
        authVersion: 0
      },
      expect.any(String),
      { expiresIn: '7d' }
    )
  })

  it('rejects weak passwords with the validation message', () => {
    strongPasswordSchema.validate.mockReturnValue({
      error: {
        details: [{ message: 'ERR_PASSWORD_WEAK' }]
      }
    })

    expect(() => {
      ensureStrongPassword({ username: 'alice', password: 'weak' })
    }).toThrow('ERR_PASSWORD_WEAK')
  })

  it('returns existing users and throws when the user is missing', () => {
    accountService.findByUsername.mockReturnValueOnce({ username: 'alice', level: 2 })

    expect(ensureExistingUser('alice')).toEqual({ username: 'alice', level: 2 })

    accountService.findByUsername.mockReturnValueOnce(null)

    expect(() => {
      ensureExistingUser('missing')
    }).toThrow('用户不存在')
  })
})
