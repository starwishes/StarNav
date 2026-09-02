// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { escapeHtml, sanitizeText } from '../../src/shared/sanitize.js'

describe('shared sanitize helpers', () => {
  it('escapes html control characters', () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    )
  })

  it('trims text, strips control characters, and enforces max length', () => {
    expect(sanitizeText('  hello\u0000world  ', 5)).toBe('hello')
  })
})
