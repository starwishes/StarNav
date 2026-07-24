import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bookmarkWriteService } from '../../../src/server/services/bookmark/bookmarkWriteService.js'
import {
  cleanupBookmarkTestContext,
  createBookmarkTestContext,
  createUniqueUrl
} from './bookmarkTestHelpers.js'

const insertCategory = (db, { id, name, level = 0, sortOrder = 0, parentId = null }) => {
  db.prepare(
    `
      INSERT INTO categories (id, name, icon, level, sort_order, parent_id)
      VALUES (?, ?, '', ?, ?, ?)
    `
  ).run(id, name, level, sortOrder, parentId)
}

const insertItem = (
  db,
  {
    id,
    name,
    url,
    categoryId = null,
    pinned = 0,
    level = 0,
    clickCount = 0,
    lastVisited = null,
    sortOrder = 0
  }
) => {
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
      VALUES (?, ?, ?, '', '', ?, ?, ?, ?, ?, ?)
    `
  ).run(id, name, url, categoryId, pinned, level, clickCount, lastVisited, sortOrder)
}

describe('bookmarkWriteService', () => {
  let ctx

  beforeEach(() => {
    ctx = createBookmarkTestContext('starnav-bookmark-write')
  })

  afterEach(async () => {
    await cleanupBookmarkTestContext(ctx.testDataDir)
  })

  it('adds bookmarks with normalized uncategorized ids and default values', () => {
    const { db } = ctx
    const url = createUniqueUrl('untitled')

    const created = bookmarkWriteService.add({
      url,
      categoryId: 0,
      pinned: true
    })

    const row = db.prepare('SELECT * FROM items WHERE id = ?').get(created.id)

    expect(created).toMatchObject({
      name: 'Untitled',
      url,
      categoryId: 0,
      pinned: true,
      level: 0,
      clickCount: 0
    })
    expect(row).toEqual(
      expect.objectContaining({
        name: 'Untitled',
        url,
        category_id: null,
        pinned: 1,
        sort_order: 0
      })
    )
    expect(typeof row.last_visited).toBe('string')
  })

  it('moves updated bookmarks to the end of the target category', () => {
    const { db } = ctx

    insertCategory(db, { id: 1, name: 'Source' })
    insertCategory(db, { id: 2, name: 'Target' })
    insertItem(db, {
      id: 1,
      name: 'Move Me',
      url: createUniqueUrl('move-me'),
      categoryId: 1,
      sortOrder: 0
    })
    insertItem(db, {
      id: 2,
      name: 'Target A',
      url: createUniqueUrl('target-a'),
      categoryId: 2,
      sortOrder: 0
    })
    insertItem(db, {
      id: 3,
      name: 'Target B',
      url: createUniqueUrl('target-b'),
      categoryId: 2,
      sortOrder: 1
    })

    const updated = bookmarkWriteService.update(1, {
      name: 'Moved Bookmark',
      categoryId: 2,
      pinned: true
    })

    expect(updated).toMatchObject({
      id: 1,
      name: 'Moved Bookmark',
      categoryId: 2,
      pinned: true,
      sortOrder: 2
    })
    expect(
      db.prepare('SELECT category_id, pinned, sort_order FROM items WHERE id = 1').get()
    ).toEqual({
      category_id: 2,
      pinned: 1,
      sort_order: 2
    })
  })

  it('returns null when updates target a missing bookmark or provide no fields', () => {
    const { db } = ctx

    insertCategory(db, { id: 1, name: 'Only Category' })
    insertItem(db, {
      id: 1,
      name: 'Existing',
      url: createUniqueUrl('existing'),
      categoryId: 1
    })

    expect(bookmarkWriteService.update(999, { name: 'Missing' })).toBeNull()
    expect(bookmarkWriteService.update(1, {})).toBeNull()
  })

  it('deletes bookmarks and reports missing ids cleanly', () => {
    const { db } = ctx

    insertItem(db, {
      id: 1,
      name: 'Delete Me',
      url: createUniqueUrl('delete-me')
    })

    expect(bookmarkWriteService.delete(1)).toBe(true)
    expect(db.prepare('SELECT COUNT(*) as count FROM items WHERE id = 1').get().count).toBe(0)
    expect(bookmarkWriteService.delete(999)).toBe(false)
  })

  it('tracks clicks and returns null for unknown bookmarks', () => {
    const { db } = ctx

    insertItem(db, {
      id: 1,
      name: 'Track Me',
      url: createUniqueUrl('track-me'),
      clickCount: 2,
      lastVisited: '2026-04-12T08:00:00.000Z'
    })

    const updated = bookmarkWriteService.trackClick(1)

    expect(updated).toMatchObject({
      id: 1,
      clickCount: 3
    })
    expect(typeof updated.lastVisited).toBe('string')
    expect(bookmarkWriteService.trackClick(999)).toBeNull()
  })

  it('bulk inserts bookmarks with normalized categories and sequential sort order', () => {
    const { db } = ctx

    insertCategory(db, { id: 2, name: 'Nested' })

    bookmarkWriteService.bulkInsert(
      [
        {
          id: 10,
          name: 'Root Item',
          url: createUniqueUrl('root-item'),
          categoryId: 0,
          pinned: true,
          level: 1,
          clickCount: 4,
          lastVisited: '2026-04-13T10:00:00.000Z'
        },
        {
          id: 11,
          name: 'Nested Item',
          url: createUniqueUrl('nested-item'),
          categoryId: 2,
          pinned: false,
          level: 2
        }
      ],
      db
    )

    expect(
      db
        .prepare(
          'SELECT id, category_id, pinned, level, click_count, sort_order FROM items ORDER BY id'
        )
        .all()
    ).toEqual([
      {
        id: 10,
        category_id: null,
        pinned: 1,
        level: 1,
        click_count: 4,
        sort_order: 0
      },
      {
        id: 11,
        category_id: 2,
        pinned: 0,
        level: 2,
        click_count: 0,
        sort_order: 1
      }
    ])
  })
})
