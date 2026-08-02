import { describe, expect, it } from 'vitest'

import {
  buildAddCategoryDialogState,
  buildAddItemDialogState,
  buildAvailableCategories,
  buildEditCategoryDialogState,
  buildEditItemDialogState,
  resolveDefaultCategoryId
} from '@/components/index/siteDialogHelpers'

describe('siteDialogHelpers', () => {
  const categories = [
    { id: 1, name: 'Root', parentId: null },
    { id: 2, name: 'Child', parentId: 1 }
  ]

  it('builds category options for dialogs and batch actions', () => {
    expect(buildAvailableCategories(categories as any)).toEqual([
      { id: 1, name: 'Root', parentId: null },
      { id: 2, name: 'Child', parentId: 1 }
    ])
  })

  it('resolves default category ids for add-item dialogs', () => {
    expect(resolveDefaultCategoryId(9, categories as any)).toBe(9)
    expect(resolveDefaultCategoryId(undefined, categories as any)).toBe(1)
    expect(resolveDefaultCategoryId(undefined, [])).toBe(0)
  })

  it('builds add-item and add-category dialog states', () => {
    expect(buildAddItemDialogState(undefined, categories as any)).toEqual({
      itemForm: {
        name: '',
        url: '',
        description: '',
        categoryId: 1,
        level: 0
      },
      categoryForm: {},
      isEditMode: false,
      dialogMode: 'site'
    })

    expect(buildAddCategoryDialogState()).toEqual({
      itemForm: {},
      categoryForm: {},
      isEditMode: false,
      dialogMode: 'category'
    })
  })

  it('builds edit dialog states for categories and bookmarks', () => {
    expect(buildEditCategoryDialogState({ id: 1, parentId: null } as any)).toEqual({
      itemForm: {},
      categoryForm: { id: 1, parentId: null },
      isEditMode: true,
      dialogMode: 'category'
    })

    expect(buildEditCategoryDialogState({ id: 2, parentId: 1 } as any)).toEqual({
      itemForm: {},
      categoryForm: { id: 2, parentId: 1 },
      isEditMode: true,
      dialogMode: 'subcategory'
    })

    expect(
      buildEditItemDialogState({
        id: 10,
        name: 'StarNav',
        url: 'https://example.com',
        description: '',
        categoryId: 1
      } as any)
    ).toEqual({
      itemForm: {
        id: 10,
        name: 'StarNav',
        url: 'https://example.com',
        description: '',
        categoryId: 1
      },
      categoryForm: {},
      isEditMode: true,
      dialogMode: 'site'
    })
  })
})
