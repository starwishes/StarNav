import type { Category, Item } from '@/types'

export type SiteDialogMode = 'site' | 'category' | 'subcategory'

export interface SiteDialogState {
  itemForm: Partial<Item>
  categoryForm: Partial<Category>
  isEditMode: boolean
  dialogMode: SiteDialogMode
}

export const buildAvailableCategories = (categories: Category[]) =>
  categories.map((category) => ({
    id: category.id,
    name: category.name,
    parentId: category.parentId
  }))

export const resolveDefaultCategoryId = (
  requestedCategoryId: number | undefined,
  categories: Category[]
) => {
  if (requestedCategoryId) {
    return requestedCategoryId
  }

  return categories.length > 0 ? categories[0].id : 0
}

export const buildAddItemDialogState = (
  requestedCategoryId: number | undefined,
  categories: Category[]
): SiteDialogState => ({
  itemForm: {
    name: '',
    url: '',
    description: '',
    categoryId: resolveDefaultCategoryId(requestedCategoryId, categories),
    level: 0
  },
  categoryForm: {},
  isEditMode: false,
  dialogMode: 'site'
})

export const buildAddCategoryDialogState = (): SiteDialogState => ({
  itemForm: {},
  categoryForm: {},
  isEditMode: false,
  dialogMode: 'category'
})

export const buildEditCategoryDialogState = (category: Category): SiteDialogState => ({
  itemForm: {},
  categoryForm: { ...category },
  isEditMode: true,
  dialogMode: category.parentId ? 'subcategory' : 'category'
})

export const buildEditItemDialogState = (item: Item): SiteDialogState => ({
  itemForm: { ...item },
  categoryForm: {},
  isEditMode: true,
  dialogMode: 'site'
})
