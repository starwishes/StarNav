import type { Category, Item, SiteConfig } from '@/types'

type RawCategory = Partial<Omit<Category, 'id' | 'level' | 'parentId'>> & {
  id?: number | string
  level?: number | string
  parentId?: number | string | null
}

type RawItem = Partial<Omit<Item, 'id' | 'categoryId' | 'pinned' | 'level' | 'clickCount'>> & {
  id?: number | string
  categoryId?: number | string
  pinned?: boolean | number | string
  level?: number | string
  clickCount?: number | string
}

export const normalizeCategory = (category: RawCategory): Category => ({
  id: Number(category.id),
  name: String(category.name || ''),
  icon: category.icon || '',
  level: Number(category.level || 0),
  parentId:
    category.parentId === undefined || category.parentId === null ? null : Number(category.parentId)
})

export const normalizeItem = (item: RawItem): Item => ({
  id: Number(item.id),
  name: String(item.name || ''),
  url: String(item.url || ''),
  description: item.description || '',
  categoryId: Number(item.categoryId || 0),
  pinned: !!item.pinned,
  level: Number(item.level || 0),
  clickCount: Number(item.clickCount || 0),
  lastVisited: item.lastVisited || undefined,
  icon: item.icon || ''
})

export const cloneCategories = (categories: Category[]) =>
  categories.map((category) => ({
    ...category
  }))

export const cloneItems = (items: Item[]) =>
  items.map((item) => ({
    ...item
  }))

export const buildSyncPayload = (
  categories: Category[],
  items: Item[],
  action?: string
): SiteConfig & { action?: string } => {
  const payload: SiteConfig & { action?: string } = {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon || '',
      level: category.level || 0,
      parentId: category.parentId ?? null
    })),
    items
  }

  if (action) {
    payload.action = action
  }

  return payload
}

export const removeCategoryLocally = (categories: Category[], items: Item[], id: number) => {
  const targetId = Number(id)
  const targetCategory = categories.find((category) => category.id === targetId)
  if (!targetCategory) {
    return { categories, items }
  }

  const parentId = targetCategory.parentId ?? null
  const fallbackCategoryId = parentId ?? 0

  return {
    categories: categories
      .map((category) => (category.parentId === targetId ? { ...category, parentId } : category))
      .filter((category) => category.id !== targetId),
    items: items.map((item) =>
      item.categoryId === targetId ? { ...item, categoryId: fallbackCategoryId } : item
    )
  }
}

export const replaceItemLocally = (
  items: Item[],
  item: Item,
  { appendToCategoryEnd = false } = {}
) => {
  const targetId = item.id
  const currentIndex = items.findIndex((existing) => existing.id === targetId)

  if (currentIndex === -1) {
    return [...items, item]
  }

  if (!appendToCategoryEnd) {
    return items.map((existing) => (existing.id === targetId ? item : existing))
  }

  const remainingItems = items.filter((existing) => existing.id !== targetId)
  let insertAt = remainingItems.length

  for (let index = remainingItems.length - 1; index >= 0; index -= 1) {
    if (remainingItems[index].categoryId === item.categoryId) {
      insertAt = index + 1
      break
    }
  }

  remainingItems.splice(insertAt, 0, item)
  return remainingItems
}

export const moveItemLocally = (
  items: Item[],
  itemId: number,
  targetCatId: number,
  targetIndex: number
) => {
  const sourceIndex = items.findIndex((item) => item.id === itemId)
  if (sourceIndex === -1) {
    return items
  }

  const sourceItem = items[sourceIndex]
  const targetCategoryId = Number(targetCatId)
  const sameCategory = Number(sourceItem.categoryId) === targetCategoryId

  // Index among items in the source/target category before the move (UI hover index).
  const sourceIndexInCategory = items
    .filter((item) => Number(item.categoryId) === Number(sourceItem.categoryId))
    .findIndex((item) => item.id === itemId)

  let insertAt = Number(targetIndex)
  if (!Number.isFinite(insertAt) || insertAt < 0) {
    insertAt = 0
  }

  // Same slot → no-op (common when dropping without changing position).
  if (sameCategory && sourceIndexInCategory === insertAt) {
    return items
  }

  // When moving down within a category, remove the source first so the hover
  // index must shift left by one to keep "insert before hovered item" semantics.
  if (sameCategory && sourceIndexInCategory >= 0 && sourceIndexInCategory < insertAt) {
    insertAt -= 1
  }

  const updatedItems = [...items]
  const [removedItem] = updatedItems.splice(sourceIndex, 1)
  const movedItem = { ...removedItem, categoryId: targetCategoryId }

  const targetCategoryItems = updatedItems.filter(
    (item) => Number(item.categoryId) === targetCategoryId
  )

  if (targetCategoryItems.length === 0) {
    updatedItems.push(movedItem)
    return updatedItems
  }

  if (insertAt >= targetCategoryItems.length) {
    const lastItemOfCategory = targetCategoryItems[targetCategoryItems.length - 1]
    const insertIndex = updatedItems.lastIndexOf(lastItemOfCategory) + 1
    updatedItems.splice(insertIndex, 0, movedItem)
    return updatedItems
  }

  const referenceItem = targetCategoryItems[insertAt]
  const insertIndex = updatedItems.indexOf(referenceItem)
  updatedItems.splice(insertIndex, 0, movedItem)
  return updatedItems
}

export const batchMoveItemsLocally = (items: Item[], ids: number[], targetCatId: number) => {
  const targetCategoryId = Number(targetCatId)
  const movedItems: Item[] = []
  const movedIdSet = new Set<number>()

  ids.forEach((id) => {
    const existingItem = items.find((item) => item.id === Number(id))
    if (
      !existingItem ||
      existingItem.categoryId === targetCategoryId ||
      movedIdSet.has(existingItem.id)
    ) {
      return
    }

    movedIdSet.add(existingItem.id)
    movedItems.push({
      ...existingItem,
      categoryId: targetCategoryId
    })
  })

  if (movedItems.length === 0) {
    return items
  }

  const remainingItems = items.filter((item) => !movedIdSet.has(item.id))
  let insertAt = remainingItems.length

  for (let index = remainingItems.length - 1; index >= 0; index -= 1) {
    if (remainingItems[index].categoryId === targetCategoryId) {
      insertAt = index + 1
      break
    }
  }

  remainingItems.splice(insertAt, 0, ...movedItems)
  return remainingItems
}

export const findDuplicateItemByUrl = (items: Item[], url: string, excludeId?: number) => {
  if (!url) {
    return null
  }

  const targetUrl = url.trim().toLowerCase()

  return (
    items.find((item) => {
      if (excludeId !== undefined && item.id === excludeId) {
        return false
      }

      return (item.url || '').trim().toLowerCase() === targetUrl
    }) || null
  )
}
