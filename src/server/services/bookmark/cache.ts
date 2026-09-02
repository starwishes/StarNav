import { logger } from '../../utils/logger.js'

/**
 * 书签域内存快照缓存（categories + items）
 *
 * 与 `cacheRuntimeService` / `cacheService`（通用 TTL 缓存）相互独立；
 * 统一的失效入口为 `cacheInvalidationService.invalidateBookmarkCaches`，
 * 写路径（`bookmarkMutationService`）在变更后调用。
 */

/** 快照内书签行的规范形态（由 mapBookmarkRow 产出，camelCase） */
export interface BookmarkSnapshotItem {
  id: number
  name: string
  url: string
  description: string
  categoryId: number
  level: number
  pinned: boolean
  clickCount: number
  lastVisited?: string | null
  [key: string]: unknown
}

/** 快照内分类行的规范形态（由 mapCategoryRow 产出，camelCase） */
export interface BookmarkSnapshotCategory {
  id: number
  name: string
  level: number
  parentId: number | null
  [key: string]: unknown
}

export interface BookmarkSnapshotCache {
  categories: BookmarkSnapshotCategory[]
  items: BookmarkSnapshotItem[]
}

declare global {
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
  // 行来自 mapCategoryRow / mapBookmarkRow（camelCase 规范形态），
  // 与快照接口一致；这里仅在边界断言形态，读侧按接口类型消费。
  global.__STARNAV_CACHE__ = {
    categories: categories as BookmarkSnapshotCategory[],
    items: items as BookmarkSnapshotItem[]
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
  const item = cache.items.find((row) => row.id === id)
  if (!item) {
    return false
  }

  // 快照统一为 camelCase（mapBookmarkRow 产出），只需更新规范字段
  item.clickCount = clickCount
  item.lastVisited = lastVisited ?? null
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
