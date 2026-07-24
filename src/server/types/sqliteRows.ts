/**
 * SQLite row shapes for prepare<T>() call sites.
 * Prefer these over bare casts; aliases match SELECT AS column names in services.
 */

/** users list (no password) — accountService.getAll */
export interface UserListRow {
  username: string
  level: number
  createdAt: string | null
  lastLogin: string | null
}

/** users full row with password — accountService.findByUsername */
export interface UserRow {
  username: string
  password: string
  level: number
  authVersion: number
  createdAt: string | null
  lastLogin: string | null
}

/** SELECT * FROM users (snake_case columns) */
export interface UserTableRow {
  username: string
  password: string
  level: number
  auth_version?: number
  created_at?: string | null
  last_login?: string | null
  [key: string]: unknown
}

/** settings.value as stored JSON string */
export interface SettingsValueRow {
  value: string
}

/** settings key+value */
export interface SettingsKeyValueRow {
  key: string
  value: string
}

/** daily_stats aggregates */
export interface DailyStatTotalsRow {
  total_pv: number
  total_uv: number
}

/** daily_stats date/pv/uv */
export interface DailyStatRow {
  date: string
  pv: number
  uv: number
}

/** visit_logs GROUP BY os/browser */
export interface NameValueStatRow {
  name: string
  value: number
}

/** categories SELECT with parentId alias */
export interface CategoryRow {
  id: number
  name: string
  icon?: string | null
  level?: number
  sort_order?: number
  parentId?: number | null
  parent_id?: number | null
  [key: string]: unknown
}

/** categories id-only */
export interface CategoryIdRow {
  id: number
}

/** items id-only */
export interface ItemIdRow {
  id: number
}

/** items id + category_id */
export interface ItemCategoryRefRow {
  id: number
  category_id?: number | null
}

/**
 * items SELECT with camelCase aliases used by bookmarkReadService.
 * Also accepts snake_case for SELECT * paths.
 */
export interface BookmarkItemRow {
  id: number
  name?: string | null
  url?: string | null
  description?: string | null
  icon?: string | null
  categoryId?: number | null
  category_id?: number | null
  pinned?: number | boolean | null
  level?: number | null
  clickCount?: number | null
  click_count?: number | null
  lastVisited?: string | null
  last_visited?: string | null
  sort_order?: number | null
  sortOrder?: number | null
  [key: string]: unknown
}

/** SearchEngine join result */
export interface BookmarkSearchRow {
  id: number
  name?: string | null
  url?: string | null
  description?: string | null
  categoryId?: number | null
  categoryName?: string | null
  [key: string]: unknown
}

/** sessions SELECT * / partial */
export interface SessionRow {
  session_id: string
  username?: string
  ip?: string | null
  user_agent?: string | null
  created_at?: string | null
  last_active_at?: string | null
  expires_at?: string | null
  [key: string]: unknown
}

/** sessions list for UI (camelCase aliases) */
export interface SessionListRow {
  sessionId: string
  ip?: string | null
  userAgent?: string | null
  createdAt?: string | null
  lastActiveAt?: string | null
}

/** audit_logs list */
export interface AuditLogRow {
  id: number
  username?: string | null
  action?: string | null
  details?: string | null
  ip?: string | null
  timestamp?: string | null
}

/** COUNT / MAX helpers */
export interface CountRow {
  count: number
}

export interface MaxIdRow {
  maxId: number | null
}

export interface NextSortOrderRow {
  nextSortOrder: number | null
}
