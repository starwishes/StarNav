import type { Category, Item } from '@/types'
import { parseDateString } from '@/utils/datetime'
import { USER_LEVEL } from '@common/constants'

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
  if (level === USER_LEVEL.USER) return t('userLevel.user')
  if (level === USER_LEVEL.VIP) return t('userLevel.vip')
  if (level === USER_LEVEL.ADMIN) return t('userLevel.admin')
  return t('userLevel.guest')
}

export const formatRelativeDate = (
  dateString: string,
  t: Translate,
  options: { locale?: string; timeZone?: string } = {},
  now = new Date()
) => {
  const date = parseDateString(dateString)
  // 非法/空值守卫：parseDateString 对不可解析输入产出 Invalid Date，若不加守卫，diff 为 NaN
  // → 全部比较分支为假 → Intl.format(Invalid Date) 抛 RangeError（与 formatDateTime 的 NaN
  // fallback 对齐，见 utils/datetime.ts）
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
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

  // 超过 7 天：显式传站点配置时区 + 当前 locale 渲染绝对日期，与表格内其他绝对时间
  // （useDateTimeFormatter → formatDateTime）的时区基准一致；无参 toLocaleDateString()
  // 会走浏览器本地时区，在配置了站点时区的部署下与其余列显示错位。
  try {
    return new Intl.DateTimeFormat(options.locale || undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(options.timeZone ? { timeZone: options.timeZone } : {})
    }).format(date)
  } catch {
    return date.toLocaleDateString(options.locale || undefined)
  }
}
