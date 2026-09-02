// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { searchBookmarks } from '../../../src/server/services/bookmark/SearchEngine.js'
import {
  cleanupBookmarkTestContext,
  createBookmarkTestContext,
  createUniqueUrl
} from './bookmarkTestHelpers.js'

const insertCategory = (db, { id, name, level = 0, sortOrder = 0, parentId = null, icon = '' }) => {
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
    categoryId = null,
    level = 0,
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
      VALUES (?, ?, ?, ?, '', ?, 0, ?, 0, ?, ?)
    `
  ).run(id, name, url, description, categoryId, level, lastVisited, sortOrder)
}

describe('searchBookmarks', () => {
  let ctx

  beforeEach(() => {
    ctx = createBookmarkTestContext('starnav-search-engine')
  })

  afterEach(async () => {
    await cleanupBookmarkTestContext(ctx.testDataDir)
  })

  it('returns most recently visited accessible bookmarks when keyword is empty', () => {
    const { db } = ctx

    insertCategory(db, { id: 1, name: 'Public', level: 0 })
    insertCategory(db, { id: 2, name: 'Private', level: 2 })
    insertItem(db, {
      id: 1,
      name: 'Newest Public',
      url: createUniqueUrl('newest-public'),
      categoryId: 1,
      lastVisited: '2026-04-13 10:00:00'
    })
    insertItem(db, {
      id: 2,
      name: 'Older Public',
      url: createUniqueUrl('older-public'),
      categoryId: null,
      lastVisited: '2026-04-12 09:00:00'
    })
    insertItem(db, {
      id: 3,
      name: 'Hidden Private',
      url: createUniqueUrl('hidden-private'),
      categoryId: 2,
      lastVisited: '2026-04-14 10:00:00'
    })
    insertItem(db, {
      id: 4,
      name: 'No Visit Yet',
      url: createUniqueUrl('no-visit'),
      categoryId: 1,
      lastVisited: null
    })

    expect(searchBookmarks('', 0, 3)).toEqual([
      expect.objectContaining({
        id: 1,
        name: 'Newest Public',
        categoryId: 1,
        categoryName: 'Public'
      }),
      expect.objectContaining({
        id: 2,
        name: 'Older Public',
        categoryId: 0,
        categoryName: null
      }),
      expect.objectContaining({
        id: 4,
        name: 'No Visit Yet',
        categoryId: 1,
        categoryName: 'Public'
      })
    ])
  })

  it('matches keyword searches against name, url, and description while respecting level limits', () => {
    const { db } = ctx
    const docsUrl = createUniqueUrl('docs')
    const repoUrl = createUniqueUrl('repo')
    const hiddenUrl = createUniqueUrl('hidden')

    insertCategory(db, { id: 1, name: 'Engineering', level: 1 })
    insertCategory(db, { id: 2, name: 'Staff', level: 3 })
    insertItem(db, {
      id: 1,
      name: 'StarNav Docs',
      url: docsUrl,
      description: 'Deployment guide',
      categoryId: 1
    })
    insertItem(db, {
      id: 2,
      name: 'Reference',
      url: repoUrl,
      description: 'Internal repo link',
      categoryId: null
    })
    insertItem(db, {
      id: 3,
      name: 'Staff Runbook',
      url: hiddenUrl,
      description: 'Confidential deployment',
      categoryId: 2
    })

    expect(searchBookmarks('deploy', 1, 10)).toEqual([
      expect.objectContaining({
        id: 1,
        name: 'StarNav Docs',
        categoryName: 'Engineering'
      })
    ])
    expect(searchBookmarks(repoUrl.slice(8, 16).toUpperCase(), 1, 10)).toEqual([
      expect.objectContaining({
        id: 2,
        name: 'Reference',
        categoryName: null
      })
    ])
  })
})
