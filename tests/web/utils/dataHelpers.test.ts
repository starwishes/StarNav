import { describe, expect, it } from 'vitest'
import { buildCategoryTree, sanitizeApiData } from '@/utils/data-helpers'

describe('data helpers', () => {
  it('builds a nested category tree and attaches each category item list', () => {
    const tree = buildCategoryTree(
      [
        { id: 1, name: 'Root', parentId: null },
        { id: 2, name: 'Child', parentId: 1 },
        { id: 3, name: 'Sibling', parentId: null }
      ],
      [
        { id: 11, name: 'Root Link', url: 'https://root.test', description: '', categoryId: 1 },
        { id: 12, name: 'Child Link', url: 'https://child.test', description: '', categoryId: 2 },
        {
          id: 13,
          name: 'Sibling Link',
          url: 'https://sibling.test',
          description: '',
          categoryId: 3
        }
      ]
    )

    expect(tree).toHaveLength(2)
    expect(tree[0]).toEqual(
      expect.objectContaining({
        id: 1,
        content: [expect.objectContaining({ id: 11 })],
        children: [
          expect.objectContaining({ id: 2, content: [expect.objectContaining({ id: 12 })] })
        ]
      })
    )
    expect(tree[1]).toEqual(
      expect.objectContaining({
        id: 3,
        content: [expect.objectContaining({ id: 13 })]
      })
    )
  })

  it('breaks parentId cycles so recursive tree traversal never loops forever', () => {
    // 2-cycle and a 3-cycle: every member must surface as a root with no children.
    const tree = buildCategoryTree(
      [
        { id: 1, name: 'A', parentId: 2 },
        { id: 2, name: 'B', parentId: 1 },
        { id: 3, name: 'C', parentId: 4 },
        { id: 4, name: 'D', parentId: 5 },
        { id: 5, name: 'E', parentId: 3 },
        { id: 6, name: 'Healthy Parent', parentId: null },
        { id: 7, name: 'Healthy Child', parentId: 6 }
      ],
      []
    )

    const byName = new Map(tree.map((cat) => [cat.name, cat]))
    expect(byName.get('A')?.children).toEqual([])
    expect(byName.get('B')?.children).toEqual([])
    expect(byName.get('C')?.children).toEqual([])
    expect(byName.get('D')?.children).toEqual([])
    expect(byName.get('E')?.children).toEqual([])

    // Non-cyclic subtrees are still wired normally.
    expect(byName.get('Healthy Parent')?.children).toEqual([
      expect.objectContaining({ id: 7, name: 'Healthy Child' })
    ])
    expect(tree).toHaveLength(6)
  })

  it('keeps a child rooted when its parent would close a cycle but drops it from a self-loop', () => {
    const tree = buildCategoryTree(
      [
        { id: 1, name: 'Self Loop', parentId: 1 },
        { id: 2, name: 'X', parentId: 3 },
        { id: 3, name: 'Y', parentId: 2 },
        { id: 4, name: 'Legit', parentId: null }
      ],
      []
    )

    const byName = new Map(tree.map((cat) => [cat.name, cat]))
    expect(byName.get('Self Loop')).toEqual(expect.objectContaining({ children: [] }))
    expect(byName.get('X')?.children).toEqual([])
    expect(byName.get('Y')?.children).toEqual([])
    expect(byName.get('Legit')?.children).toEqual([])
  })

  it('sanitizes api payloads, coercing types and dropping invalid or duplicate items', () => {
    const result = sanitizeApiData({
      categories: [
        { id: '1', name: 'Docs', level: '2', parentId: '0' },
        { id: 2, name: null, level: undefined, parentId: '1' }
      ],
      items: [
        {
          id: '10',
          name: 'Guide',
          url: 'https://guide.test',
          description: 'Docs',
          categoryId: '1' as any,
          level: '1',
          pinned: 'yes',
          clickCount: '7',
          lastVisited: '2026-04-13T10:00:00.000Z',
          icon: '/icon.png'
        },
        {
          id: '10',
          name: 'Duplicate',
          url: 'https://duplicate.test',
          description: '',
          categoryId: 1 as any
        },
        {
          id: '11',
          name: '',
          url: 'https://invalid.test',
          description: '',
          categoryId: 1 as any
        },
        null as never
      ]
    } as any)

    expect(result.categories).toEqual([
      { id: 1, name: 'Docs', level: 2, parentId: null },
      { id: 2, name: '', level: 0, parentId: 1 }
    ])
    expect(result.items).toEqual([
      {
        id: 10,
        name: 'Guide',
        url: 'https://guide.test',
        description: 'Docs',
        categoryId: 1,
        level: 1,
        pinned: true,
        clickCount: 7,
        lastVisited: '2026-04-13T10:00:00.000Z',
        icon: '/icon.png'
      }
    ])
  })
})
