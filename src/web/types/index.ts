/**
 * Frontend type surface — re-exports shared contract from `src/shared/types`.
 * Prefer importing domain shapes from here (`@/types`) in the SPA.
 */

export type {
  Item,
  Category,
  SiteConfig,
  ImportedBookmarkItem,
  User,
  AuthUser,
  AuthResult,
  SystemSettings,
  ApiResponse,
  GenericApiResponse,
  OpenAPI
} from '../../shared/types/index.ts'
