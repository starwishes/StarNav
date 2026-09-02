// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { categoryReadService } from '../../../src/server/services/bookmark/categoryReadService.js'
import { cleanupBookmarkTestContext, createBookmarkTestContext } from './bookmarkTestHelpers.js'

const insertCategory = (db, { id, name, icon = '', level = 0, sortOrder = 0, parentId = null }) => {
  db.prepare(
    `
      INSERT INTO categories (id, name, icon, level, sort_order, parent_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(id, name, icon, level, sortOrder, parentId)
}

describe('categoryReadService', () => {
  let ctx

  beforeEach(() => {
    ctx = createBookmarkTestContext('starnav-category-read')
  })

  afterEach(async () => {
    await cleanupBookmarkTestContext(ctx.testDataDir)
  })

  it('returns ordered categories with normalized parent ids', () => {
    const { db } = ctx

    insertCategory(db, { id: 1, name: 'Root', level: 0, sortOrder: 2, parentId: null })
    insertCategory(db, { id: 2, name: 'Visible Child', level: 1, sortOrder: 1, parentId: 1 })
    insertCategory(db, { id: 3, name: 'Hidden Child', level: 2, sortOrder: 0, parentId: 1 })

    expect(categoryReadService.getAll(1)).toEqual([
      {
        id: 2,
        name: 'Visible Child',
        icon: '',
        level: 1,
        sort_order: 1,
        parentId: 1
      },
      {
        id: 1,
        name: 'Root',
        icon: '',
        level: 0,
        sort_order: 2,
        parentId: null
      }
    ])
  })

  it('returns only visible category ids for the caller level', () => {
    const { db } = ctx

    insertCategory(db, { id: 1, name: 'Public', level: 0 })
    insertCategory(db, { id: 2, name: 'Member', level: 1 })
    insertCategory(db, { id: 3, name: 'Admin', level: 3 })

    expect([...categoryReadService.getValidIds(1)]).toEqual([1, 2])
  })
})
