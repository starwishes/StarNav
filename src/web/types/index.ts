/**
 * Frontend type surface — re-exports shared contract from `src/shared/types`.
 * Prefer importing domain shapes from here (`@/types`) in the SPA.
 */

export type {
  Item,
  Bookmark,
  Category,
  SiteConfig,
  ImportedBookmarkItem,
  User,
  AuthUser,
  AuthResult,
  Session,
  SystemSettings,
  ApiResponse,
  GenericApiResponse,
  Pagination,
  PaginatedResponse,
  SiteStats,
  DailyStats,
  AuditLog,
  OpenAPI
} from '../../shared/types/index.ts'
