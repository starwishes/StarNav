import { logger } from '../../utils/logger.js'

/**
 * 书签域内存快照缓存（categories + items）
 * 与 `cacheRuntimeService` / `cacheService`（通用 TTL 缓存）相互独立；
 * 统一失效入口见后续 Phase 3。
 */

export interface BookmarkSnapshotCache {
  categories: Array<Record<string, unknown>>
  items: Array<Record<string, unknown>>
}

declare global {
  // eslint-disable-next-line no-var
  var __STARNAV_CACHE__: BookmarkSnapshotCache | null | undefined
}

// 内存缓存单例 (使用 global 以确保在测试环境下模块多次加载时依然同步)
global.__STARNAV_CACHE__ = global.__STARNAV_CACHE__ || null

/**
 * 重建缓存
 */
export function rebuildCache(
  categories: Array<Record<string, unknown>>,
  items: Array<Record<string, unknown>>
) {
  global.__STARNAV_CACHE__ = {
    categories,
    items
  }
  logger.debug('缓存已重建')
}

/**
 * 失效缓存
 */
export function invalidateCache() {
  global.__STARNAV_CACHE__ = null
  logger.debug('缓存已失效')
}

/**
 * 获取缓存
 */
export function getCache(): BookmarkSnapshotCache | null {
  return global.__STARNAV_CACHE__ ?? null
}

/**
 * 检查缓存是否存在
 */
export function hasCache(): boolean {
  return global.__STARNAV_CACHE__ != null
}
