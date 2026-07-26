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
 * 点击统计热路径：若快照仍在内存，原地更新 click 字段，避免整表失效。
 * @returns true if snapshot was patched in place
 */
export function patchItemClickInCache(
  itemId: number | string,
  clickCount: number,
  lastVisited: string | null | undefined
): boolean {
  const cache = global.__STARNAV_CACHE__
  if (!cache?.items?.length) {
    return false
  }

  const id = Number(itemId)
  const item = cache.items.find((row) => Number(row.id) === id)
  if (!item) {
    return false
  }

  item.clickCount = clickCount
  item.click_count = clickCount
  item.lastVisited = lastVisited ?? null
  item.last_visited = lastVisited ?? null
  logger.debug(`快照已原地更新点击: item=${id} count=${clickCount}`)
  return true
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
