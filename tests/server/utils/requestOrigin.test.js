import { describe, expect, it } from 'vitest'
import {
  isAllowedCorsOrigin,
  validateTrustedWriteOrigin
} from '../../../src/server/utils/requestOrigin.js'

const makeRequest = (origin, referer) => ({
  protocol: 'http',
  get: (name) => (name === 'host' ? 'localhost:3333' : undefined),
  headers: {
    ...(origin ? { origin } : {}),
    ...(referer ? { referer } : {})
  }
})

describe('requestOrigin', () => {
  describe('validateTrustedWriteOrigin', () => {
    it('允许同源请求', () => {
      const req = makeRequest('http://localhost:3333')
      expect(validateTrustedWriteOrigin(req)).toMatchObject({ source: 'origin', trusted: true })
    })

    it('默认拒绝扩展来源(cookie 写请求策略)', () => {
      const req = makeRequest('chrome-extension://abcdefghijklmnop')
      const result = validateTrustedWriteOrigin(req)
      expect(result.source).toBe('origin')
      expect(result.trusted).toBe(false)
    })

    it('allowExtensionOrigins=true 时允许扩展来源(登录场景)', () => {
      const chromeExt = makeRequest('chrome-extension://abcdefghijklmnop')
      expect(validateTrustedWriteOrigin(chromeExt, { allowExtensionOrigins: true })).toMatchObject({
        trusted: true
      })

      const firefoxExt = makeRequest('moz-extension://12345678-1234-1234-1234-123456789abc')
      expect(validateTrustedWriteOrigin(firefoxExt, { allowExtensionOrigins: true })).toMatchObject(
        { trusted: true }
      )
    })

    it('允许扩展 Referer 来源(开启扩展豁免时)', () => {
      const req = makeRequest(null, 'chrome-extension://abcdefghijklmnop/options/options.html')
      expect(validateTrustedWriteOrigin(req, { allowExtensionOrigins: true })).toMatchObject({
        source: 'referer',
        trusted: true
      })
    })

    it('拒绝跨站 http 来源(即使开启扩展豁免)', () => {
      const req = makeRequest('https://evil.example.com')
      const result = validateTrustedWriteOrigin(req, { allowExtensionOrigins: true })
      expect(result.source).toBe('origin')
      expect(result.trusted).toBe(false)
    })

    it('无来源头时 source 为 null(CLI/同源 fetch 放行策略由调用方决定)', () => {
      expect(validateTrustedWriteOrigin(makeRequest(null, null))).toEqual({
        trusted: false,
        source: null,
        origin: null
      })
    })
  })

  describe('isAllowedCorsOrigin', () => {
    it('允许扩展来源通过 CORS', () => {
      expect(isAllowedCorsOrigin('chrome-extension://abcdefghijklmnop')).toBe(true)
    })
  })
})
