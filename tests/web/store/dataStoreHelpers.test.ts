import { describe, expect, it } from 'vitest'

import {
  buildSyncPayload,
  findDuplicateItemByUrl,
  moveItemLocally,
  normalizeCategory,
  normalizeItem,
  removeCategoryLocally,
  replaceItemLocally
} from '@/store/dataStoreHelpers'

describe('dataStoreHelpers', () => {
  it('normalizes category and item records from loosely typed payloads', () => {
    expect(
      normalizeCategory({
        id: '2',
        name: 123 as unknown as string,
        icon: undefined,
        level: '3',
        parentId: '1'
      })
    ).toEqual({
      id: 2,
      name: '123',
      icon: '',
      level: 3,
      parentId: 1
    })

    expect(
      normalizeItem({
        id: '9',
        name: 'GitHub',
        url: 'https://github.com',
        categoryId: '0',
        pinned: 1 as unknown as boolean,
        level: '2',
        clickCount: '7',
        icon: null as unknown as string
      })
    ).toEqual({
      id: 9,
      name: 'GitHub',
      url: 'https://github.com',
      description: '',
      categoryId: 0,
      pinned: true,
      level: 2,
      clickCount: 7,
      lastVisited: undefined,
      icon: ''
    })
  })

  it('builds sync payloads with normalized category metadata and optional action', () => {
    expect(
      buildSyncPayload(
        [{ id: 1, name: 'Root', icon: '', level: 0, parentId: null }],
        [
          {
            id: 10,
            name: 'GitHub',
            url: 'https://github.com',
            description: '',
            categoryId: 0
          }
        ],
        '同步测试'
      )
    ).toEqual({
      categories: [{ id: 1, name: 'Root', icon: '', level: 0, parentId: null }],
      items: [
        {
          id: 10,
          name: 'GitHub',
          url: 'https://github.com',
          description: '',
          categoryId: 0
        }
      ],
      action: '同步测试'
    })
  })

  it('removes a category locally and reparents descendants plus items', () => {
    const state = removeCategoryLocally(
      [
        { id: 1, name: 'Root', parentId: null },
        { id: 2, name: 'Child', parentId: 1 },
        { id: 3, name: 'Grandchild', parentId: 2 }
      ],
      [
        { id: 10, name: 'Move Me', url: 'https://move.test', description: '', categoryId: 2 },
        { id: 11, name: 'Keep Me', url: 'https://keep.test', description: '', categoryId: 3 }
      ],
      2
    )

    expect(state.categories).toEqual([
      { id: 1, name: 'Root', parentId: null },
      { id: 3, name: 'Grandchild', parentId: 1 }
    ])
    expect(state.items).toEqual([
      { id: 10, name: 'Move Me', url: 'https://move.test', description: '', categoryId: 1 },
      { id: 11, name: 'Keep Me', url: 'https://keep.test', description: '', categoryId: 3 }
    ])
  })

  it('replaces moved items either in place or at the end of the target category', () => {
    const items = [
      { id: 1, name: 'A', url: 'https://a.test', description: '', categoryId: 1 },
      { id: 2, name: 'B', url: 'https://b.test', description: '', categoryId: 2 },
      { id: 3, name: 'C', url: 'https://c.test', description: '', categoryId: 2 }
    ]

    expect(
      replaceItemLocally(items, {
        id: 2,
        name: 'B2',
        url: 'https://b.test',
        description: '',
        categoryId: 2
      })
    ).toEqual([
      { id: 1, name: 'A', url: 'https://a.test', description: '', categoryId: 1 },
      { id: 2, name: 'B2', url: 'https://b.test', description: '', categoryId: 2 },
      { id: 3, name: 'C', url: 'https://c.test', description: '', categoryId: 2 }
    ])

    expect(
      replaceItemLocally(
        items,
        { id: 1, name: 'A', url: 'https://a.test', description: '', categoryId: 2 },
        { appendToCategoryEnd: true }
      ).map((item) => item.id)
    ).toEqual([2, 3, 1])
  })

  it('moves items within category groups and appends to empty targets', () => {
    const items = [
      { id: 1, name: 'A', url: 'https://a.test', description: '', categoryId: 1 },
      { id: 2, name: 'B', url: 'https://b.test', description: '', categoryId: 2 },
      { id: 3, name: 'C', url: 'https://c.test', description: '', categoryId: 2 },
      { id: 4, name: 'D', url: 'https://d.test', description: '', categoryId: 3 }
    ]

    expect(moveItemLocally(items, 1, 2, 1).map((item) => item.id)).toEqual([2, 1, 3, 4])
    expect(moveItemLocally(items, 4, 9, 0).map((item) => item.id)).toEqual([1, 2, 3, 4])
    expect(moveItemLocally(items, 99, 2, 0)).toBe(items)

    // Same-category reorder: insert before hovered index (with down-move adjustment).
    const sameCategory = [
      { id: 1, name: 'A', url: 'https://a.test', description: '', categoryId: 1 },
      { id: 2, name: 'B', url: 'https://b.test', description: '', categoryId: 1 },
      { id: 3, name: 'C', url: 'https://c.test', description: '', categoryId: 1 },
      { id: 4, name: 'D', url: 'https://d.test', description: '', categoryId: 1 }
    ]
    expect(moveItemLocally(sameCategory, 1, 1, 2).map((item) => item.id)).toEqual([2, 1, 3, 4])
    expect(moveItemLocally(sameCategory, 4, 1, 1).map((item) => item.id)).toEqual([1, 4, 2, 3])
    expect(moveItemLocally(sameCategory, 2, 1, 1)).toBe(sameCategory)
  })

  it('finds duplicate urls case-insensitively and respects excluded ids', () => {
    const items = [
      { id: 1, name: 'GitHub', url: 'https://github.com', description: '', categoryId: 0 },
      { id: 2, name: 'Docs', url: 'https://docs.example.com', description: '', categoryId: 0 }
    ]

    expect(findDuplicateItemByUrl(items, '  HTTPS://GITHUB.COM ')).toEqual(items[0])
    expect(findDuplicateItemByUrl(items, 'https://github.com', 1)).toBeNull()
    expect(findDuplicateItemByUrl(items, '')).toBeNull()
  })
})
