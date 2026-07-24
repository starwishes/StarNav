import { describe, expect, it } from 'vitest'

import { escapeHtml, isValidUsername, sanitizeText } from '../../src/shared/sanitize.js'

describe('shared sanitize helpers', () => {
  it('escapes html control characters', () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    )
  })

  it('trims text, strips control characters, and enforces max length', () => {
    expect(sanitizeText('  hello\u0000world  ', 5)).toBe('hello')
  })

  it('validates usernames with the shared 3-20 char rule', () => {
    expect(isValidUsername('star_nav_01')).toBe(true)
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('bad-name')).toBe(false)
  })
})
