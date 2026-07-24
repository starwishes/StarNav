import type { Category } from '@/types'
import type { CSSProperties } from 'vue'

const vibrantGradients = [
  ['#6366f1', '#a855f7'],
  ['#3b82f6', '#2dd4bf'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#3b82f6'],
  ['#ec4899', '#8b5cf6'],
  ['#4f46e5', '#7c3aed'],
  ['#0ea5e9', '#2563eb'],
  ['#f43f5e', '#fb923c'],
  ['#8b5cf6', '#d946ef'],
  ['#14b8a6', '#0ea5e9'],
  ['#f97316', '#eab308'],
  ['#d946ef', '#c026d3']
] as const

export const hasChildCategories = (category: Pick<Category, 'children'>) =>
  Boolean(category.children?.length)

export const getCategoryHeaderPadding = (depth: number) =>
  `${14 + (depth > 0 ? depth * 20 + 10 : 0)}px`

export const getCategoryInitials = (name: string | undefined) => {
  const safeName = name || 'S'
  const parts = safeName.trim().split(/\s+/)

  if (/^[A-Za-z0-9]{2}$/.test(parts[0] || '')) {
    return parts[0].toUpperCase()
  }

  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  return safeName.charAt(0).toUpperCase()
}

export const getCategoryInitialStyle = (
  name: string | undefined,
  initials: string
): CSSProperties => {
  const safeName = name || 'S'
  const charSum = Array.from(safeName).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const [primaryColor, secondaryColor] = vibrantGradients[charSum % vibrantGradients.length]

  return {
    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: initials.length > 1 ? '13px' : '15px',
    boxShadow: `0 4px 12px ${primaryColor}44`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}
