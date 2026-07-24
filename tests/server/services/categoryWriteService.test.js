import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { categoryWriteService } from '../../../src/server/services/bookmark/categoryWriteService.js'
import { cleanupBookmarkTestContext, createBookmarkTestContext } from './bookmarkTestHelpers.js'

const insertCategory = (db, { id, name, level = 0, sortOrder = 0, parentId = null }) => {
  db.prepare(
    `
      INSERT INTO categories (id, name, icon, level, sort_order, parent_id)
      VALUES (?, ?, '', ?, ?, ?)
    `
  ).run(id, name, level, sortOrder, parentId)
}

const insertItem = (db, { id, name, url, categoryId = null }) => {
  db.prepare(
    `
      INSERT INTO items (
        id,
        name,
        url,
        description,
        icon,
        category_id,
        pinned,
        level,
        click_count,
        last_visited,
        sort_order
      )
      VALUES (?, ?, ?, '', '', ?, 0, 0, 0, NULL, 0)
    `
  ).run(id, name, url, categoryId)
}

describe('categoryWriteService', () => {
  let ctx

  beforeEach(() => {
    ctx = createBookmarkTestContext('starnav-category-write')
  })

  afterEach(async () => {
    await cleanupBookmarkTestContext(ctx.testDataDir)
  })

  it('adds categories with defaults and normalizes root parent ids to null', () => {
    const { db } = ctx

    const created = categoryWriteService.add({
      name: 'Top Level',
      parentId: 0
    })

    expect(created).toEqual({
      id: 1,
      name: 'Top Level',
      icon: '',
      level: 0,
      parentId: null
    })
    expect(db.prepare('SELECT parent_id, sort_order FROM categories WHERE id = 1').get()).toEqual({
      parent_id: null,
      sort_order: 0
    })
  })

  it('updates categories and can clear the parent relation', () => {
    const { db } = ctx

    insertCategory(db, { id: 1, name: 'Parent' })
    insertCategory(db, { id: 2, name: 'Child', level: 1, parentId: 1 })

    const updated = categoryWriteService.update(2, {
      name: 'Updated Child',
      icon: 'icon-folder',
      level: 2,
      parentId: 0
    })

    expect(updated).toMatchObject({
      id: 2,
      name: 'Updated Child',
      icon: 'icon-folder',
      level: 2,
      sort_order: 0,
      parentId: null
    })
    expect(
      db.prepare('SELECT name, icon, level, parent_id FROM categories WHERE id = 2').get()
    ).toEqual({
      name: 'Updated Child',
      icon: 'icon-folder',
      level: 2,
      parent_id: null
    })
  })

  it('reparents children and uncategorizes items when deleting a root category', () => {
    const { db } = ctx

    insertCategory(db, { id: 1, name: 'Root' })
    insertCategory(db, { id: 2, name: 'Child', parentId: 1 })
    insertItem(db, { id: 1, name: 'Root Item', url: 'https://root-item.test', categoryId: 1 })
    insertItem(db, { id: 2, name: 'Child Item', url: 'https://child-item.test', categoryId: 2 })

    const result = categoryWriteService.delete(1)

    expect(result).toEqual({
      id: 1,
      parentId: null,
      targetCategoryId: 0
    })
    expect(db.prepare('SELECT parent_id FROM categories WHERE id = 2').get()).toEqual({
      parent_id: null
    })
    expect(db.prepare('SELECT category_id FROM items WHERE id = 1').get()).toEqual({
      category_id: null
    })
    expect(db.prepare('SELECT category_id FROM items WHERE id = 2').get()).toEqual({
      category_id: 2
    })
  })

  it('reparents descendants and items to the direct parent when deleting a child category', () => {
    const { db } = ctx

    insertCategory(db, { id: 1, name: 'Root' })
    insertCategory(db, { id: 2, name: 'Child', parentId: 1 })
    insertCategory(db, { id: 3, name: 'Grandchild', parentId: 2 })
    insertItem(db, { id: 1, name: 'Child Item', url: 'https://child-item.test', categoryId: 2 })

    const result = categoryWriteService.delete(2)

    expect(result).toEqual({
      id: 2,
      parentId: 1,
      targetCategoryId: 1
    })
    expect(db.prepare('SELECT parent_id FROM categories WHERE id = 3').get()).toEqual({
      parent_id: 1
    })
    expect(db.prepare('SELECT category_id FROM items WHERE id = 1').get()).toEqual({
      category_id: 1
    })
  })

  it('bulk inserts categories with sequential sort order and preserved parents', () => {
    const { db } = ctx

    categoryWriteService.bulkInsert(
      [
        {
          id: 1,
          name: 'Root',
          level: 0,
          parentId: null
        },
        {
          id: 2,
          name: 'Child',
          level: 1,
          parentId: 1
        }
      ],
      db
    )

    expect(
      db.prepare('SELECT id, level, sort_order, parent_id FROM categories ORDER BY id').all()
    ).toEqual([
      {
        id: 1,
        level: 0,
        sort_order: 0,
        parent_id: null
      },
      {
        id: 2,
        level: 1,
        sort_order: 1,
        parent_id: 1
      }
    ])
  })

  it('returns null when updates have no fields or the category is missing', () => {
    const { db } = ctx

    insertCategory(db, { id: 1, name: 'Only Category' })

    expect(categoryWriteService.update(1, {})).toBeNull()
    expect(categoryWriteService.update(999, { name: 'Missing' })).toBeNull()
    expect(categoryWriteService.delete(999)).toBeNull()
  })
})
