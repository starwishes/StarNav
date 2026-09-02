/**
 * Shared domain shapes for progressive server typing (strict mode).
 * Prefer these over bare `any` / untyped params at service boundaries.
 *
 * Id-like wire values often arrive as string | number from Express/Joi.
 */

export type IdLike = number | string
export type UsernameLike = string | null | undefined
export type LevelLike = number | string | null | undefined

export interface RequestContextLike {
  ip?: string
  userAgent?: string
  operator?: string
}

export interface AuthCredentials {
  username?: string
  password?: string
  level?: number
  remember?: boolean
}

export interface AuthUserLike {
  username: string
  level?: number
  sessionId?: string
  authVersion?: number
  source?: string
  password?: string
}

export interface AuditLogInput {
  username?: string
  ip?: string
  userAgent?: string
  success?: boolean
  details?: string
  revokedCount?: number
  [key: string]: unknown
}

export interface PaginationQuery {
  page?: string | number
  limit?: string | number
  [key: string]: unknown
}

export interface AuditClearQuery {
  /** 可选：只删除此日期（UTC，YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS）之前的日志 */
  before?: unknown
}

export interface BookmarkPayload {
  name?: string
  url?: string
  description?: string
  categoryId?: number | string
  icon?: string
  pinned?: boolean
  minLevel?: number
  level?: number
  [key: string]: unknown
}

export interface CategoryPayload {
  name?: string
  icon?: string
  minLevel?: number
  level?: number
  parentId?: number | string | null
  [key: string]: unknown
}

export interface BulkDataContent {
  categories?: unknown[]
  items?: unknown[]
  action?: string
  content?: BulkDataContent
  [key: string]: unknown
}

export interface BookmarkMovePayload {
  categoryId?: number | string
  targetIndex?: number | string
  [key: string]: unknown
}

export interface BookmarkBatchPayload {
  ids?: Array<number | string>
  [key: string]: unknown
}

export interface BookmarkBatchMovePayload extends BookmarkBatchPayload {
  categoryId?: number | string
}

export interface CategoryReorderPayload {
  orderedIds?: Array<number | string>
  [key: string]: unknown
}

export interface SessionCreateOptions {
  expiresInDays?: number | string
  [key: string]: unknown
}

export interface SettingsMap {
  backgroundUrl?: string
  footerHtml?: string
  faviconUrl?: string
  homeUrl?: string
  logoUrl?: string
  timezone?: string
  [key: string]: unknown
}

export interface DbRow {
  id?: number | string
  category_id?: number | string | null
  [key: string]: unknown
}

/** Re-export sqlite row shapes for service call sites */
export type {
  UserListRow,
  UserRow,
  UserTableRow,
  SettingsValueRow,
  SettingsKeyValueRow,
  CategoryRow,
  CategoryIdRow,
  ItemIdRow,
  ItemCategoryRefRow,
  BookmarkItemRow,
  BookmarkSearchRow,
  SessionRow,
  SessionListRow,
  AuditLogRow,
  CountRow,
  NextSortOrderRow
} from './sqliteRows.js'
