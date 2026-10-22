// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  bookmarkUpdateSchema,
  categoryCreateSchema,
  dataSchema,
  loginSchema,
  strongPasswordSchema
} from '../../src/server/validation.js'

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

  it('rejects non-integer and oversized bulk ids/categoryIds (round 34 L7)', () => {
    // item id 非整数
    const badItemId = dataSchema.validate({
      categories: [{ id: 1, name: 'Root' }],
      items: [{ id: 1.5, name: 'Docs', url: 'https://docs.test', categoryId: 1 }]
    })
    expect(badItemId.error).toBeDefined()

    // item categoryId 非整数：此前会被静默归入未分类
    const badCategoryId = dataSchema.validate({
      categories: [{ id: 1, name: 'Root' }],
      items: [{ id: 2, name: 'Docs', url: 'https://docs.test', categoryId: 1.5 }]
    })
    expect(badCategoryId.error).toBeDefined()

    // item categoryId 为负
    const negativeCategoryId = dataSchema.validate({
      categories: [{ id: 1, name: 'Root' }],
      items: [{ id: 2, name: 'Docs', url: 'https://docs.test', categoryId: -1 }]
    })
    expect(negativeCategoryId.error).toBeDefined()

    // category id 非整数
    const badCategoryIdField = dataSchema.validate({
      categories: [{ id: 1.5, name: 'Root' }],
      items: []
    })
    expect(badCategoryIdField.error).toBeDefined()

    // 超出 Number.MAX_SAFE_INTEGER 的 id（Joi number() 默认上限，避免以
    // 不精确的浮点 id 落库后被别处 Number() 语义破坏）
    const oversizedItemId = dataSchema.validate({
      categories: [{ id: 1, name: 'Root' }],
      items: [
        { id: Number.MAX_SAFE_INTEGER + 1, name: 'Docs', url: 'https://docs.test', categoryId: 1 }
      ]
    })
    expect(oversizedItemId.error).toBeDefined()

    // 合法整数 id 仍通过
    const ok = dataSchema.validate({
      categories: [{ id: 1, name: 'Root' }],
      items: [{ id: 2, name: 'Docs', url: 'https://docs.test', categoryId: 0 }]
    })
    expect(ok.error).toBeUndefined()
  })

  it('rejects zero and negative bulk ids (round 35 G3)', () => {
    const build = (categories, items) => dataSchema.validate({ categories, items })

    // item id 为 0/负数：与前端虚拟"未分类" id=0 撞 id，且与 batchDelete 的 .positive() 口径不一致
    expect(
      build(
        [{ id: 1, name: 'Root' }],
        [{ id: 0, name: 'Docs', url: 'https://d.test', categoryId: 1 }]
      ).error
    ).toBeDefined()
    expect(
      build(
        [{ id: 1, name: 'Root' }],
        [{ id: -3, name: 'Docs', url: 'https://d.test', categoryId: 1 }]
      ).error
    ).toBeDefined()

    // category id 为 0/负数
    expect(build([{ id: 0, name: 'Root' }], []).error).toBeDefined()
    expect(build([{ id: -1, name: 'Root' }], []).error).toBeDefined()
  })

  it('rejects bulk arrays beyond the configured size caps (round 35 G3)', () => {
    const tooManyCategories = dataSchema.validate({
      categories: Array.from({ length: 5001 }, (_, index) => ({
        id: index + 1,
        name: `C${index}`
      })),
      items: []
    })
    expect(tooManyCategories.error).toBeDefined()

    const tooManyItems = dataSchema.validate({
      categories: [{ id: 1, name: 'Root' }],
      items: Array.from({ length: 20001 }, (_, index) => ({
        id: index + 1,
        name: `I${index}`,
        url: 'https://docs.test',
        categoryId: 1
      }))
    })
    expect(tooManyItems.error).toBeDefined()

    // 恰好达到上限仍通过
    const atCap = dataSchema.validate({
      categories: [{ id: 1, name: 'Root' }],
      items: []
    })
    expect(atCap.error).toBeUndefined()
  })
})
