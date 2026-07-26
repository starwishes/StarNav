/**
 * StarNav shared domain + API envelope types.
 *
 * Single source of truth for shapes used by the Vue SPA and backend tooling.
 * Runtime implementations live in sibling `common/*.ts` modules.
 *
 * Naming follows the HTTP/API wire format used by the frontend (camelCase fields).
 */

import type { GenericApiResponse } from '../api.js'

// OpenAPI paths/components: regenerate with `npm run openapi:types`
export type * as OpenAPI from './openapi.generated.js'

// ==================== Bookmarks / navigation ====================

/** Bookmark / site item as returned to the SPA */
export interface Item {
  id: number
  name: string
  url: string
  description: string
  categoryId: number
  pinned?: boolean
  level?: number
  clickCount?: number
  lastVisited?: string
  icon?: string
}

/** Alias used in some docs/tools */
export type Bookmark = Item

export interface Category {
  id: number
  name: string
  icon?: string
  level?: number
  content?: Item[]
  isVirtual?: boolean
  parentId?: number | null
  children?: Category[]
}

export interface SiteConfig {
  categories: Category[]
  items: Item[]
}

export interface ImportedBookmarkItem {
  name: string
  url: string
  description: string
  categoryName: string
}

// ==================== Auth / users ====================

export interface User {
  username: string
  level: number
  created_at?: string
  createdAt?: string
  lastLogin?: string
}

export interface AuthUser {
  login: string
  name: string
  level: number
  avatar_url?: string
}

export interface AuthResult {
  success: boolean
  error?: string
}

export interface Session {
  session_id: string
  username: string
  ip?: string
  user_agent?: string
  created_at: string
  last_active_at: string
  expires_at: string
}

// ==================== System settings ====================

export interface SystemSettings {
  registrationEnabled?: boolean
  backgroundUrl?: string
  timezone?: string
  homeUrl?: string
  footerHtml?: string
  siteName?: string
  logoUrl?: string
  faviconUrl?: string
  defaultUserLevel?: number
  siteDescription?: string
  allowRegister?: boolean
  defaultSearchEngine?: string
}

// ==================== API envelope (shared with common/api) ====================

/** Preferred name in app code; same shape as GenericApiResponse */
export type ApiResponse<T = unknown> = GenericApiResponse<T>

export type { GenericApiResponse }

// ==================== Stats / audit (optional shared) ====================

export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface PaginatedResponse<T> {
  success?: boolean
  data?: T[]
  pagination: Pagination
  error?: string
  message?: string
  code?: string
}

export interface SiteStats {
  totalBookmarks: number
  totalCategories: number
  totalUsers: number
  totalClicks: number
}

export interface DailyStats {
  date: string
  visits: number
  unique_visitors: number
}

export interface AuditLog {
  id?: number
  username?: string
  action: string
  details?: string
  ip?: string
  created_at?: string
}
