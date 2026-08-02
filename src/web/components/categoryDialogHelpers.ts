import type { Category } from '@/types'

export const cloneCategoryDialogForm = (form: Partial<Category> | undefined): Partial<Category> =>
  JSON.parse(JSON.stringify(form || {}))
