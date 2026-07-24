import { computed } from 'vue'

import i18n from '@/plugins/i18n'
import { useDataStore } from '@/store/data'
import type { Category, Item } from '@/types'
import { buildCategoryTree } from '@/utils/data-helpers'

const findCategoryInTree = (categories: Category[], categoryId: number): Category | null => {
  for (const category of categories) {
    if (category.id === categoryId) {
      return category
    }

    const nestedMatch = findCategoryInTree(category.children || [], categoryId)
    if (nestedMatch) {
      return nestedMatch
    }
  }

  return null
}

const collectTreeItems = (categories: Category[]): Item[] =>
  categories.flatMap((category) => [
    ...(category.content || []),
    ...collectTreeItems(category.children || [])
  ])

export function useSiteProjection() {
  const dataStore = useDataStore()

  const categoryTree = computed<Category[]>(() => {
    const projectedTree = buildCategoryTree(dataStore.categories, dataStore.items)
    const uncategorizedItems = dataStore.items.filter((item) => item.categoryId === 0)

    if (uncategorizedItems.length === 0) {
      return projectedTree
    }

    return [
      ...projectedTree,
      {
        id: 0,
        name: i18n.global.t('table.uncategorized'),
        content: uncategorizedItems,
        parentId: null,
        children: [],
        isVirtual: true,
        level: 0
      }
    ]
  })

  const allItems = computed<Item[]>(() => collectTreeItems(categoryTree.value))

  const findCategoryById = (categoryId: number) =>
    findCategoryInTree(categoryTree.value, categoryId)

  return {
    categoryTree,
    allItems,
    findCategoryById
  }
}
