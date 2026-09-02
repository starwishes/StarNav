import type { Item } from '@/types'
import { USER_LEVEL } from '@common/constants'

export const countItemsInCategory = (items: Item[], categoryId: number) =>
  items.filter((item) => item.categoryId === categoryId).length

export const getCategoryLevelClass = (level: number) => {
  const classes = ['is-success', 'is-info', 'is-warning', 'is-danger']
  return classes[level] || 'is-neutral'
}

export const getCategoryLevelLabelKey = (level: number) => {
  if (level === USER_LEVEL.USER) return 'userLevel.user'
  if (level === USER_LEVEL.VIP) return 'userLevel.vip'
  if (level === USER_LEVEL.ADMIN) return 'userLevel.admin'
  return 'userLevel.guest'
}
