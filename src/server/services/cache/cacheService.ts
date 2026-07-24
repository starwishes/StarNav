import { cacheRuntimeService } from './cacheRuntimeService.js'

/**
 * 通用 TTL 缓存门面（HTTP/业务短期缓存）。
 * 与 `src/server/services/bookmark/cache.js` 的书签快照缓存无关。
 */
export const cacheService = cacheRuntimeService

export default cacheService
