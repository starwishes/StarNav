import { describe, expect, it } from 'vitest'

import { validators } from '../../../src/server/utils/validators.js'

describe('validators', () => {
  it('validates urls, usernames, passwords, and plain strings', () => {
    expect(validators.isValidUrl('https://example.com')).toBe(true)
    expect(validators.isValidUrl('http://example.com')).toBe(true)
    expect(validators.isValidUrl('ftp://example.com')).toBe(false)

    expect(validators.isValidUsername('user_123')).toBe(true)
    expect(validators.isValidUsername('ab')).toBe(false)
    expect(validators.isValidUsername('user@123')).toBe(false)

    expect(validators.isStrongPassword('12345678')).toBe(true)
    expect(validators.isStrongPassword('1234567')).toBe(false)

    expect(validators.isNonEmptyString(' hello ')).toBe(true)
    expect(validators.isNonEmptyString('   ')).toBe(false)
    expect(validators.isNonEmptyString(1)).toBe(false)
  })

  it('validates numeric ranges, user levels, emails, category ids, and json payloads', () => {
    expect(validators.isIntegerInRange(3, 0, 5)).toBe(true)
    expect(validators.isIntegerInRange(5.5, 0, 5)).toBe(false)
    expect(validators.isValidUserLevel(0)).toBe(true)
    expect(validators.isValidUserLevel(4)).toBe(false)

    expect(validators.isValidEmail('user@example.com')).toBe(true)
    expect(validators.isValidEmail('invalid-email')).toBe(false)

    expect(validators.isValidCategoryId(1)).toBe(true)
    expect(validators.isValidCategoryId(0)).toBe(false)

    expect(validators.isValidJSON('{"ok":true}')).toBe(true)
    expect(validators.isValidJSON('{bad json')).toBe(false)
    expect(validators.isValidJSON(12)).toBe(false)
  })
})
