import { afterEach, describe, expect, it } from 'vitest'

import {
  clearAuthCookieHeader,
  createAuthCookieHeader,
  shouldUseSecureAuthCookie
} from '../../../src/server/utils/authCookie.js'

describe('auth cookie helpers', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalAuthCookieSecure = process.env.AUTH_COOKIE_SECURE
  const originalTrustProxy = process.env.TRUST_PROXY

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    process.env.AUTH_COOKIE_SECURE = originalAuthCookieSecure
    process.env.TRUST_PROXY = originalTrustProxy
  })

  it('omits Secure for plain http requests and enables it for https requests', () => {
    const httpReq = {
      protocol: 'http',
      secure: false,
      headers: {},
      get: () => ''
    }
    const httpsReq = {
      protocol: 'https',
      secure: true,
      headers: {},
      get: () => ''
    }

    expect(shouldUseSecureAuthCookie(httpReq)).toBe(false)
    expect(shouldUseSecureAuthCookie(httpsReq)).toBe(true)
    expect(
      createAuthCookieHeader('token-http', { secure: shouldUseSecureAuthCookie(httpReq) })
    ).not.toContain('Secure')
    expect(
      createAuthCookieHeader('token-https', { secure: shouldUseSecureAuthCookie(httpsReq) })
    ).toContain('Secure')
  })

  it('honors forwarded https and explicit environment overrides', () => {
    const proxiedHttpsReq = {
      protocol: 'http',
      secure: false,
      headers: {
        'x-forwarded-proto': 'https'
      },
      get: (name) => (name === 'x-forwarded-proto' ? 'https' : '')
    }

    expect(shouldUseSecureAuthCookie(proxiedHttpsReq)).toBe(false)

    process.env.TRUST_PROXY = 'true'
    expect(shouldUseSecureAuthCookie(proxiedHttpsReq)).toBe(true)

    process.env.AUTH_COOKIE_SECURE = 'false'
    expect(shouldUseSecureAuthCookie(proxiedHttpsReq)).toBe(false)
    expect(
      clearAuthCookieHeader({ secure: shouldUseSecureAuthCookie(proxiedHttpsReq) })
    ).not.toContain('Secure')

    process.env.AUTH_COOKIE_SECURE = 'true'
    expect(
      shouldUseSecureAuthCookie({ protocol: 'http', secure: false, headers: {}, get: () => '' })
    ).toBe(true)
  })
})
