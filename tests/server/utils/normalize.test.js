import { describe, expect, it } from 'vitest'

import { normalizeUrl } from '../../../src/shared/url.js'

describe('normalize utils', () => {
  it('normalizes shared urls with existing backend rules', () => {
    expect(normalizeUrl(' Example.com/path/?utm_source=test#')).toBe('https://example.com/path')
    expect(normalizeUrl('ftp://example.com')).toBe('')
    expect(normalizeUrl('mailto:test@example.com')).toBe('')
    expect(normalizeUrl('javascript:alert(1)')).toBe('')
  })
})
