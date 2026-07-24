import type { Category, Item } from '@/types'

export interface DisplayedSiteItem extends Item {
  realCategoryId: number
}

export interface SiteMoveState {
  active: boolean
  item?: Pick<Item, 'id'> | null
  hoverCategoryId: number
  hoverItemIndex: number
}

const normalizeCategoryItems = (
  items: Item[] | undefined,
  categoryId: number
): DisplayedSiteItem[] =>
  (items || []).map((item) => ({
    ...item,
    realCategoryId: categoryId
  }))

export const hasChildCategories = (category: Pick<Category, 'children'>) =>
  Boolean(category.children?.length)

export const resolveInitialActiveTabId = (category: Category) => {
  if (!hasChildCategories(category)) {
    return category.id
  }

  if (category.content && category.content.length > 0) {
    return category.id
  }

  return category.children![0].id
}

export const collectBranchItems = (category: Category): DisplayedSiteItem[] => {
  let items = normalizeCategoryItems(category.content, category.id)

  for (const child of category.children || []) {
    items = items.concat(collectBranchItems(child))
  }

  return items
}

export const findCategoryById = (categories: Category[], categoryId: number): Category | null => {
  for (const category of categories) {
    if (category.id === categoryId) {
      return category
    }

    const nestedMatch = findCategoryById(category.children || [], categoryId)
    if (nestedMatch) {
      return nestedMatch
    }
  }

  return null
}

export const resolveSelectedCategory = (categories: Category[], categoryId: number) =>
  findCategoryById(categories, categoryId)

export const resolveDisplayedItems = (category: Category, activeTabId: number) => {
  if (activeTabId === category.id) {
    return collectBranchItems(category)
  }

  const selectedCategory = resolveSelectedCategory(category.children || [], activeTabId)
  return selectedCategory
    ? normalizeCategoryItems(selectedCategory.content, selectedCategory.id)
    : []
}

export const resolveItemCategoryId = (
  item: Pick<DisplayedSiteItem, 'realCategoryId'>,
  fallbackCategoryId: number
) => item.realCategoryId || fallbackCategoryId

export const isHoveringMoveTarget = (
  moveState: SiteMoveState,
  itemIndex: number,
  categoryId: number
) =>
  moveState.active &&
  moveState.hoverCategoryId === categoryId &&
  moveState.hoverItemIndex === itemIndex
