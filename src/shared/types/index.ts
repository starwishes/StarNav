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
  /** 0 = 未分类（DB 层为 NULL，API 输出统一归一为 0） */
  categoryId: number
  pinned?: boolean
  level?: number
  clickCount?: number
  lastVisited?: string | null
  icon?: string
  /** 仅部分写接口返回（update/move/reorder） */
  sortOrder?: number
}

export interface Category {
  id: number
  name: string
  icon?: string
  level?: number
  content?: Item[]
  isVirtual?: boolean
  parentId?: number | null
  children?: Category[]
  /** 仅部分写接口返回（update/reorder） */
  sortOrder?: number
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
  createdAt?: string
  lastLogin?: string
}

export interface AuthUser {
  login: string
  name: string
  level: number
  /** 历史遗留可选字段：服务端 buildAuthUser 只产出 login/name/level，
   *  该字段仅为兼容 localStorage `admin_user` 中可能残留的旧键（AdminSidebar 头像分支）。 */
  avatar_url?: string
}

export interface AuthResult {
  success: boolean
  error?: string
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
}

// ==================== API envelope (shared with common/api) ====================

/** Preferred name in app code; same shape as GenericApiResponse */
export type ApiResponse<T = unknown> = GenericApiResponse<T>

export type { GenericApiResponse }
