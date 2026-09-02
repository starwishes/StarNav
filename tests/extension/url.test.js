import { describe, expect, it } from 'vitest'

import { normalizeUrl } from '../../clients/extension/common/url.js'

describe('browser extension url helper', () => {
  it('normalizes host casing, path slashes, and strips tracking parameters', () => {
    expect(normalizeUrl(' Example.COM/path//to/?utm_source=test&fbclid=123&keep=1# ')).toBe(
      'https://example.com/path/to?keep=1'
    )
  })

  it('rejects unsupported schemes and malformed hostnames', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBe('')
    expect(normalizeUrl('https://example..com')).toBe('')
  })

  it('auto-prefixes bare domains and removes trailing empty markers', () => {
    expect(normalizeUrl('docs.example.com/?')).toBe('https://docs.example.com/')
  })
})
