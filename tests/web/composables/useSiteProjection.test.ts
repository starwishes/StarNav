import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

const { useDataStore } = await import('@/store/data')
const { useSiteProjection } = await import('@/composables/useSiteProjection')

describe('useSiteProjection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('builds a single tree projection and appends an uncategorized virtual category', () => {
    const store = useDataStore()
    store.categories = [
      { id: 1, name: 'Root', parentId: null },
      { id: 2, name: 'Child', parentId: 1 }
    ]
    store.items = [
      { id: 10, name: 'Root Item', url: 'https://root.test', description: '', categoryId: 1 },
      { id: 11, name: 'Child Item', url: 'https://child.test', description: '', categoryId: 2 },
      {
        id: 12,
        name: 'Loose Item',
        url: 'https://loose.test',
        description: '',
        categoryId: 0
      }
    ]

    const { categoryTree, allItems, findCategoryById } = useSiteProjection()

    expect(categoryTree.value).toHaveLength(2)
    expect(categoryTree.value[0]).toEqual(
      expect.objectContaining({
        id: 1,
        content: [expect.objectContaining({ id: 10 })],
        children: [expect.objectContaining({ id: 2 })]
      })
    )
    expect(categoryTree.value[1]).toEqual(
      expect.objectContaining({
        id: 0,
        isVirtual: true,
        content: [expect.objectContaining({ id: 12 })]
      })
    )
    expect(allItems.value.map((item) => item.id)).toEqual([10, 11, 12])
    expect(findCategoryById(2)).toEqual(expect.objectContaining({ id: 2 }))
    expect(findCategoryById(0)).toEqual(expect.objectContaining({ id: 0, isVirtual: true }))
  })
})
