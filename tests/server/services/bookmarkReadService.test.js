// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bookmarkReadService } from '../../../src/server/services/bookmark/bookmarkReadService.js'
import {
  cleanupBookmarkTestContext,
  createBookmarkTestContext,
  createUniqueUrl
} from './bookmarkTestHelpers.js'

const insertCategory = (db, { id, name, icon = '', level = 0, sortOrder = 0, parentId = null }) => {
  db.prepare(
    `
      INSERT INTO categories (id, name, icon, level, sort_order, parent_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(id, name, icon, level, sortOrder, parentId)
}

const insertItem = (
  db,
  {
    id,
    name,
    url,
    description = '',
    icon = '',
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    id,
    name,
    url,
    description,
    icon,
    categoryId,
    pinned,
    level,
    clickCount,
    lastVisited,
    sortOrder
  )
}

describe('bookmarkReadService', () => {
  let ctx

  beforeEach(() => {
    ctx = createBookmarkTestContext('starnav-bookmark-read')
  })

  afterEach(async () => {
    await cleanupBookmarkTestContext(ctx.testDataDir)
  })

  it('keeps uncategorized bookmarks visible and normalizes fields when valid category ids are empty', () => {
    const { db } = ctx
    const uncategorizedUrl = createUniqueUrl('root')

    insertCategory(db, { id: 1, name: 'Visible Category', level: 0 })
    insertItem(db, {
      id: 1,
      name: 'Root Bookmark',
      url: uncategorizedUrl,
      categoryId: null,
      pinned: 1,
      level: 0,
      clickCount: 2,
      lastVisited: '2026-04-13T10:00:00.000Z',
      sortOrder: 0
    })
    insertItem(db, {
      id: 2,
      name: 'Hidden Bookmark',
      url: createUniqueUrl('hidden'),
      categoryId: 1,
      level: 0,
      sortOrder: 1
    })

    const items = bookmarkReadService.getAll(0, new Set())

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: 1,
      name: 'Root Bookmark',
      url: uncategorizedUrl,
      categoryId: 0,
      pinned: true,
      level: 0,
      clickCount: 2,
      lastVisited: '2026-04-13T10:00:00.000Z'
    })
  })

  it('filters by allowed categories and caller level while preserving sort order', () => {
    const { db } = ctx

    insertCategory(db, { id: 1, name: 'Allowed', level: 0 })
    insertCategory(db, { id: 2, name: 'Blocked', level: 0 })
    insertItem(db, {
      id: 1,
      name: 'Allowed First',
      url: createUniqueUrl('allowed-first'),
      categoryId: 1,
      level: 0,
      sortOrder: 0
    })
    insertItem(db, {
      id: 2,
      name: 'Blocked Category',
      url: createUniqueUrl('blocked'),
      categoryId: 2,
      level: 0,
      sortOrder: 1
    })
    insertItem(db, {
      id: 3,
      name: 'Level Too High',
      url: createUniqueUrl('private'),
      categoryId: 1,
      level: 2,
      sortOrder: 2
    })
    insertItem(db, {
      id: 4,
      name: 'Uncategorized Last',
      url: createUniqueUrl('uncategorized'),
      categoryId: null,
      level: 0,
      sortOrder: 3
    })

    const items = bookmarkReadService.getAll(0, new Set([1]))

    expect(items.map((item) => item.name)).toEqual(['Allowed First', 'Uncategorized Last'])
  })

  it('respects both bookmark level and category level when checking duplicate urls', () => {
    const { db } = ctx
    const publicUrl = createUniqueUrl('public-url')
    const restrictedUrl = createUniqueUrl('restricted-url')

    insertCategory(db, { id: 1, name: 'Public Category', level: 0 })
    insertCategory(db, { id: 2, name: 'Restricted Category', level: 2 })
    insertItem(db, {
      id: 1,
      name: 'Public Bookmark',
      url: publicUrl,
      categoryId: null,
      level: 0,
      clickCount: 1
    })
    insertItem(db, {
      id: 2,
      name: 'Restricted Bookmark',
      url: restrictedUrl,
      categoryId: 2,
      level: 0,
      clickCount: 3
    })

    expect(bookmarkReadService.checkUrl(publicUrl, 0)).toMatchObject({
      id: 1,
      categoryId: 0,
      clickCount: 1,
      pinned: false
    })
    expect(bookmarkReadService.checkUrl(restrictedUrl, 0)).toBeNull()
    expect(bookmarkReadService.checkUrl(restrictedUrl, 2)).toMatchObject({
      id: 2,
      categoryId: 2,
      clickCount: 3,
      pinned: false
    })
  })
})
