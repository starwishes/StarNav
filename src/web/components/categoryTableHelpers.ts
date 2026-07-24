import type { Item } from '@/types'

export const countItemsInCategory = (items: Item[], categoryId: number) =>
  items.filter((item) => item.categoryId === categoryId).length

export const getCategoryLevelClass = (level: number) => {
  const classes = ['is-success', 'is-info', 'is-warning', 'is-danger']
  return classes[level] || 'is-neutral'
}

export const getCategoryLevelLabelKey = (level: number) => {
  if (level === 1) return 'userLevel.user'
  if (level === 2) return 'userLevel.vip'
  if (level === 3) return 'userLevel.admin'
  return 'userLevel.guest'
}
