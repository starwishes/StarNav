import { bookmarkReadService } from './bookmarkReadService.js'
import { categoryReadService } from './categoryReadService.js'
import { rebuildCache, getCache, hasCache } from './cache.js'
import type { LevelLike } from '../../types/domain.js'

const normalizeLevel = (visitorLevel: LevelLike = 0) => {
  if (typeof visitorLevel === 'number') {
    return visitorLevel
  }

  const parsed = Number.parseInt(String(visitorLevel ?? 0), 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

export const bookmarkSnapshotService = {
  getData(visitorLevel: LevelLike = 0) {
    const level = normalizeLevel(visitorLevel)

    // 测试环境下强制实时读取数据库，不经过缓存
    if (process.env.NODE_ENV === 'test') {
      const categories = categoryReadService.getAll(level)
      const validCategoryIds = new Set(categories.map((category) => category.id))
      const items = bookmarkReadService.getAll(level, validCategoryIds)
      return { categories, items }
    }

    // 正常环境下使用全局缓存
    if (!hasCache()) {
      const allCategories = categoryReadService.getAll(999)
      const allItems = bookmarkReadService.getAll(999)
      rebuildCache(allCategories, allItems)
    }

    const cache = getCache()
    if (!cache) {
      return { categories: [], items: [] }
    }

    const categories = cache.categories.filter(
      (category) => Number(category.level || 0) <= level
    )
    const validCategoryIds = new Set(categories.map((category) => category.id))
    const items = cache.items.filter(
      (item) =>
        Number(item.level || 0) <= level &&
        (item.categoryId === 0 || validCategoryIds.has(item.categoryId))
    )

    return { categories, items }
  },

  getCategories(level: LevelLike = 999) {
    return categoryReadService.getAll(normalizeLevel(level))
  }
}
