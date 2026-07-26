import { describe, expect, it } from 'vitest'

import {
  bookmarkUpdateSchema,
  categoryCreateSchema,
  dataSchema,
  loginSchema,
  strongPasswordSchema
} from '../../../src/server/middleware/validation.js'

describe('validation schemas', () => {
  it('accepts legacy login payloads while enforcing the basic shape', () => {
    expect(loginSchema.validate({ username: 'alice1', password: 'secret' }).error).toBeUndefined()
    expect(loginSchema.validate({ username: 'ab', password: 'secret' }).error).toBeDefined()
  })

  it('rejects weak passwords with the exported message key', () => {
    const result = strongPasswordSchema.validate({
      username: 'alice1',
      password: 'weakpass'
    })

    expect(result.error?.details[0]?.message).toBe('ERR_PASSWORD_WEAK')
  })

  it('accepts passwords with upper, lower, and digit without requiring symbols', () => {
    const ok = strongPasswordSchema.validate({
      username: 'alice1',
      password: 'Password1'
    })
    const withSymbol = strongPasswordSchema.validate({
      username: 'alice1',
      password: 'Password1!'
    })
    const noDigit = strongPasswordSchema.validate({
      username: 'alice1',
      password: 'Password'
    })

    expect(ok.error).toBeUndefined()
    expect(withSymbol.error).toBeUndefined()
    expect(noDigit.error?.details[0]?.message).toBe('ERR_PASSWORD_WEAK')
  })

  it('accepts direct and wrapped data payloads and normalizes empty parent ids', () => {
    const direct = dataSchema.validate({
      action: '',
      categories: [{ id: 1, name: 'Root', parentId: '' }],
      items: [{ id: 2, name: 'Docs', url: 'https://docs.test', categoryId: 1 }]
    })
    const wrapped = dataSchema.validate({
      content: {
        categories: [{ id: 3, name: 'Child', parentId: '' }],
        items: [{ id: 4, name: 'Wiki', url: 'https://wiki.test', categoryId: 3 }]
      }
    })

    expect(direct.error).toBeUndefined()
    expect(direct.value.categories[0].parentId).toBeNull()
    expect(wrapped.error).toBeUndefined()
    expect(wrapped.value.content.categories[0].parentId).toBeNull()
  })

  it('rejects empty bookmark updates and normalizes category parent ids', () => {
    expect(bookmarkUpdateSchema.validate({}).error).toBeDefined()

    const category = categoryCreateSchema.validate({
      name: 'New Category',
      parentId: ''
    })

    expect(category.error).toBeUndefined()
    expect(category.value.parentId).toBeNull()
  })
})
