import type { Category, Item } from '@/types'

export type ClickCountSort = 'default' | 'desc' | 'asc'
type Translate = (key: string, params?: Record<string, unknown>) => string

export const SITE_TABLE_PAGE_SIZES = [10, 20, 50, 100]

export const cycleClickCountSort = (current: ClickCountSort): ClickCountSort => {
  if (current === 'default') return 'desc'
  if (current === 'desc') return 'asc'
  return 'default'
}

export const sortItemsByClickCount = (items: Item[], sort: ClickCountSort) => {
  if (sort === 'default') {
    return items
  }

  return [...items].sort((left, right) => {
    const delta = (left.clickCount || 0) - (right.clickCount || 0)
    return sort === 'asc' ? delta : -delta
  })
}

export const getTotalPages = (itemCount: number, pageSize: number) =>
  Math.max(1, Math.ceil(itemCount / pageSize))

export const paginateItems = (items: Item[], currentPage: number, pageSize: number) => {
  const start = (currentPage - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export const getPaginationRange = (itemCount: number, currentPage: number, pageSize: number) => {
  if (itemCount === 0) {
    return { start: 0, end: 0 }
  }

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, itemCount)
  return { start, end }
}

export const toggleSelectedId = (selectedIds: number[], itemId: number, checked: boolean) => {
  if (checked) {
    return Array.from(new Set([...selectedIds, itemId]))
  }

  return selectedIds.filter((id) => id !== itemId)
}

export const selectPageItemIds = (items: Item[], checked: boolean) =>
  checked ? items.map((item) => item.id) : []

export const selectItemsByIds = (items: Item[], selectedIds: Set<number>) =>
  items.filter((item) => selectedIds.has(item.id))

export const parseOptionalNumber = (value: string | number | null | undefined) => {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

export const getCategoryNameById = (categories: Category[], categoryId: number, t: Translate) => {
  if (categoryId === 0) {
    return t('table.uncategorized')
  }

  return categories.find((category) => category.id === categoryId)?.name || t('table.uncategorized')
}

export const getVisibilityBadgeClass = (level: number) => {
  const classes = ['is-success', 'is-info', 'is-warning', 'is-danger']
  return classes[level] || 'is-neutral'
}

export const getVisibilityLabel = (level: number, t: Translate) => {
  if (level === 1) return t('userLevel.user')
  if (level === 2) return t('userLevel.vip')
  if (level === 3) return t('userLevel.admin')
  return t('userLevel.guest')
}

export const formatRelativeDate = (dateString: string, t: Translate, now = new Date()) => {
  const date = new Date(dateString)
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return t('time.justNow')
  if (diff < 3600000) {
    return t('time.minutesAgo', { n: Math.floor(diff / 60000) })
  }
  if (diff < 86400000) {
    return t('time.hoursAgo', { n: Math.floor(diff / 3600000) })
  }
  if (diff < 604800000) {
    return t('time.daysAgo', { n: Math.floor(diff / 86400000) })
  }

  return date.toLocaleDateString()
}
