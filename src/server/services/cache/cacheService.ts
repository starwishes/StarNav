import { cacheRuntimeService } from './cacheRuntimeService.js'

/**
 * 通用 TTL 缓存门面（HTTP/业务短期缓存）。
 * 与 `src/server/services/bookmark/cache.js` 的书签快照缓存无关。
 *
 * 统一使用命名导出 `cacheService` 引用，避免 default/别名/动态导入混用。
 */
export const cacheService = cacheRuntimeService
