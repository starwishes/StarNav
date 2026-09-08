import { getDb, forceCheckpoint } from '../database/database.js'
import { backupDatabaseThrottled } from '../database/backupThrottle.js'
import { logger } from '../../utils/logger.js'
import { ApiError, errors } from '../../utils/errors.js'
import { bookmarkWriteService } from './bookmarkWriteService.js'
import { categoryWriteService } from './categoryWriteService.js'
import { patchItemClickInCache } from './cache.js'
import { invalidateBookmarkCaches } from '../cache/cacheInvalidationService.js'
import { normalizeDbCategoryId, normalizeDbParentId } from './recordTransforms.js'
import type {
  BookmarkPayload,
  BulkDataContent,
  CategoryPayload,
  IdLike
} from '../../types/domain.js'

const displayBulkEntryName = (name: unknown) => String(name ?? '').slice(0, 50) || '<unnamed>'

/**
 * bulk 导入（POST /data 全量替换）的悬空父引用校验（第 32 轮 Pi L1 专项）。
 *
 * 导入是整组替换：事务内先 DELETE 全部再 INSERT，因此合法的引用集合只有本次
 * 导入文件内的分类 id 集（「文件内 ∪ 现库」不适用——现库分类此时已全部被替换，
 * 指向现库的引用导入后必然悬空）。categories.parent_id 无外键约束，悬空引用会
 * 静默入库并令子分类从首页树中消失；items.category_id 虽有 FK 兑底，但报错是
 * 泛化的 SQLITE_CONSTRAINT 400。这里在写库前统一做精确校验，报错时带条目序号
 * 与名称，方便定位。前端 useImportExport 已先行 remap（无映射归根/归未分类），
 * 常规 UI 导入不会触发本校验；该校验是原始 API/CLI 导入的服务端兜底。
 */
const assertBulkReferences = (
  categories: Array<CategoryPayload & { id?: IdLike }>,
  items: Array<BookmarkPayload & { id?: IdLike }>
) => {
  const fileCategoryIds = new Set<number>()
  for (const category of categories) {
    const id = Number(category.id)
    if (Number.isInteger(id) && id > 0) {
      fileCategoryIds.add(id)
    }
  }

  categories.forEach((category, index) => {
    const parentId = normalizeDbParentId(category.parentId)
    if (parentId !== null && !fileCategoryIds.has(parentId)) {
      throw errors.badRequest(
        `导入数据第 ${index + 1} 个分类「${displayBulkEntryName(category.name)}」的父分类 ${parentId} 不存在于本次导入的分类列表中（导入为全量替换，父引用必须在文件内可解析）`
      )
    }
  })

  items.forEach((item, index) => {
    const categoryId = normalizeDbCategoryId(item.categoryId)
    if (categoryId !== null && !fileCategoryIds.has(categoryId)) {
      throw errors.badRequest(
        `导入数据第 ${index + 1} 个书签「${displayBulkEntryName(item.name)}」引用的分类 ${categoryId} 不存在于本次导入的分类列表中（可省略 categoryId 归入未分类）`
      )
    }
  })
}

type BulkCategoryRow = CategoryPayload & { id?: IdLike }
type BulkItemRow = BookmarkPayload & {
  id?: IdLike
  clickCount?: number
  lastVisited?: string | null
}

export const bookmarkMutationService = {
  saveData(content: BulkDataContent = {}) {
    const db = getDb()
    const { categories = [], items = [] } = content

    // 悬空父引用在备份/删除前拒绝，避免为注定失败的导入白写一份整库快照
    assertBulkReferences(
      categories as Array<CategoryPayload & { id?: IdLike }>,
      items as Array<BookmarkPayload & { id?: IdLike }>
    )

    // 整库备份：整树替换是破坏性最大的操作（DELETE 全部后重建），
    // 强制备份（忽略 5s 节流窗口），确保删除前始终有写前快照。
    const backedUp = backupDatabaseThrottled(true)
    if (!backedUp) {
      // 写前备份未真正执行（force 窗口/退避/复制失败）——拒绝无快照的全量替换
      throw errors.internal('写前备份未完成，已中止数据保存')
    }

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM items').run()
      db.prepare('DELETE FROM categories').run()

      categoryWriteService.bulkInsert(categories as BulkCategoryRow[], db)
      bookmarkWriteService.bulkInsert(items as BulkItemRow[], db)
    })

    try {
      transaction()
      invalidateBookmarkCaches()
      forceCheckpoint()
      logger.info(`数据保存成功: ${categories.length} 分类, ${items.length} 书签`)
    } catch (error) {
      // 领域校验错误（如分类环引用，400）直接透传，不做转换也不按服务端错误记录
      if (error instanceof ApiError) throw error
      logger.error('数据保存失败', error)
      // 约束冲突（重复 URL / 悬空分类）是导入数据问题，按 400 返回并给出可操作提示
      const sqliteError = error as { code?: string }
      if (
        typeof sqliteError?.code === 'string' &&
        sqliteError.code.startsWith('SQLITE_CONSTRAINT')
      ) {
        throw errors.badRequest('数据校验失败：导入数据包含重复 URL 或引用了不存在的分类')
      }
      // 其余真实异常向上抛出（500）
      throw errors.internal('数据保存失败')
    }
  },

  trackClick(itemId: IdLike, level: number | string | null | undefined = 0) {
    const result = bookmarkWriteService.trackClick(itemId, level)
    if (result) {
      // Hot path: keep snapshot when possible; still drop data TTL so /api/data is fresh.
      // Search TTL can lag on clickCount without user-visible harm.
      const patched = patchItemClickInCache(
        result.id as IdLike,
        Number(result.clickCount || 0),
        (result.lastVisited as string | null | undefined) ?? null
      )
      invalidateBookmarkCaches(undefined, {
        includeSnapshot: !patched,
        includeSearch: false
      })
    }
    return result
  },

  deleteItem(itemId: IdLike) {
    const success = bookmarkWriteService.delete(itemId)
    if (success) {
      invalidateBookmarkCaches()
    }
    return success
  },

  moveItem(itemId: IdLike, targetCategoryId: IdLike, targetIndex: IdLike) {
    const result = bookmarkWriteService.move(itemId, targetCategoryId, targetIndex)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  batchMoveItems(itemIds: IdLike[], targetCategoryId: IdLike) {
    const result = bookmarkWriteService.batchMove(itemIds, targetCategoryId)
    if (Array.isArray(result) && result.length > 0) {
      invalidateBookmarkCaches()
    }
    return result
  },

  batchDeleteItems(itemIds: IdLike[]) {
    const result = bookmarkWriteService.batchDelete(itemIds)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  updateItem(itemId: IdLike, updateData: BookmarkPayload) {
    const result = bookmarkWriteService.update(itemId, updateData)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  addItem(itemData: BookmarkPayload) {
    const result = bookmarkWriteService.add(itemData)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  addCategory(categoryData: CategoryPayload) {
    const result = categoryWriteService.add(categoryData)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  updateCategory(categoryId: IdLike, updateData: CategoryPayload | BookmarkPayload) {
    const result = categoryWriteService.update(categoryId, updateData)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  deleteCategory(categoryId: IdLike) {
    const result = categoryWriteService.delete(categoryId)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  reorderCategories(orderedIds: IdLike[]) {
    const result = categoryWriteService.reorder(orderedIds)
    if (Array.isArray(result) && result.length > 0) {
      invalidateBookmarkCaches()
    }
    return result
  }
}
