import type { Category, Item } from '@/types'

export interface JsonBackupContent {
  categories: Category[]
  items: Item[]
}

export interface JsonBackupMeta {
  schemaVersion: number
  exportedAt: string
  categoryCount: number
  itemCount: number
}

export interface JsonBackupPayload {
  meta: JsonBackupMeta
  content: JsonBackupContent
}

export interface ParsedJsonBackup {
  meta: JsonBackupMeta | null
  content: JsonBackupContent
}

const isArrayPayload = (value: unknown): value is unknown[] => Array.isArray(value)

const isBackupContent = (value: unknown): value is JsonBackupContent => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<JsonBackupContent>
  return isArrayPayload(candidate.categories) && isArrayPayload(candidate.items)
}

export const buildJsonBackupPayload = ({
  categories,
  items
}: JsonBackupContent): JsonBackupPayload => ({
  meta: {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    categoryCount: categories.length,
    itemCount: items.length
  },
  content: {
    categories,
    items
  }
})

export const parseJsonBackupPayload = (value: unknown): ParsedJsonBackup | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  if (isBackupContent(value)) {
    return {
      meta: null,
      content: value
    }
  }

  const candidate = value as Partial<JsonBackupPayload>
  if (!isBackupContent(candidate.content)) {
    return null
  }

  return {
    meta: candidate.meta || null,
    content: candidate.content
  }
}
