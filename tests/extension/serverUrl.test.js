import { describe, expect, it } from 'vitest'

import { isAllowedLoginOrigin, normalizeServerUrl } from '../../clients/extension/utils/url.js'

describe('browser extension server url utils', () => {
  it('normalizes server roots by trimming and stripping trailing slashes', () => {
    expect(normalizeServerUrl(' https://nav.example.com/ ')).toBe('https://nav.example.com')
    expect(normalizeServerUrl('http://127.0.0.1:3333///')).toBe('http://127.0.0.1:3333')
    expect(normalizeServerUrl('')).toBe('')
  })

  it('allows https targets for login', () => {
    expect(isAllowedLoginOrigin('https://nav.example.com')).toBe(true)
    expect(isAllowedLoginOrigin('https://nav.example.com/')).toBe(true)
    expect(isAllowedLoginOrigin('  https://nav.example.com  ')).toBe(true)
  })

  it('allows loopback http targets for local development', () => {
    expect(isAllowedLoginOrigin('http://127.0.0.1:3333')).toBe(true)
    expect(isAllowedLoginOrigin('http://localhost:3333')).toBe(true)
    expect(isAllowedLoginOrigin('http://[::1]:3333')).toBe(true)
  })

  it('rejects plaintext http targets that are not loopback', () => {
    expect(isAllowedLoginOrigin('http://nav.example.com')).toBe(false)
    expect(isAllowedLoginOrigin('http://192.168.1.10:3333')).toBe(false)
    expect(isAllowedLoginOrigin('http://0.0.0.0:3333')).toBe(false)
  })

  it('rejects empty, malformed, or unsupported scheme targets', () => {
    expect(isAllowedLoginOrigin('')).toBe(false)
    expect(isAllowedLoginOrigin('nav.example.com')).toBe(false)
    expect(isAllowedLoginOrigin('javascript:alert(1)')).toBe(false)
    expect(isAllowedLoginOrigin('ftp://nav.example.com')).toBe(false)
  })
})
