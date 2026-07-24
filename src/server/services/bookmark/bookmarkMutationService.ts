import { getDb, forceCheckpoint, backupDatabase } from '../database/database.js'
import { logger } from '../../utils/logger.js'
import { bookmarkWriteService } from './bookmarkWriteService.js'
import { categoryWriteService } from './categoryWriteService.js'
import { invalidateBookmarkCaches } from '../cache/cacheInvalidationService.js'
import type {
  BookmarkPayload,
  BulkDataContent,
  CategoryPayload,
  IdLike
} from '../../types/domain.js'

type BulkCategoryRow = CategoryPayload & { id?: IdLike }
type BulkItemRow = BookmarkPayload & {
  id?: IdLike
  clickCount?: number
  lastVisited?: string | null
}

export const bookmarkMutationService = {
  saveData(_username: string | null | undefined, content: BulkDataContent = {}) {
    const db = getDb()
    const { categories = [], items = [] } = content

    backupDatabase()

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
      return true
    } catch (error) {
      logger.error('数据保存失败', error)
      return false
    }
  },

  trackClick(itemId: IdLike) {
    const result = bookmarkWriteService.trackClick(itemId)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  deleteItem(_username: string | null | undefined, itemId: IdLike) {
    const success = bookmarkWriteService.delete(itemId)
    if (success) {
      invalidateBookmarkCaches()
    }
    return success
  },

  moveItem(
    _username: string | null | undefined,
    itemId: IdLike,
    targetCategoryId: IdLike,
    targetIndex: IdLike
  ) {
    const result = bookmarkWriteService.move(itemId, targetCategoryId, targetIndex)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  batchMoveItems(
    _username: string | null | undefined,
    itemIds: IdLike[],
    targetCategoryId: IdLike
  ) {
    const result = bookmarkWriteService.batchMove(itemIds, targetCategoryId)
    if (Array.isArray(result) && result.length > 0) {
      invalidateBookmarkCaches()
    }
    return result
  },

  batchDeleteItems(_username: string | null | undefined, itemIds: IdLike[]) {
    const result = bookmarkWriteService.batchDelete(itemIds)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  updateItem(
    _username: string | null | undefined,
    itemId: IdLike,
    updateData: BookmarkPayload
  ) {
    const result = bookmarkWriteService.update(itemId, updateData)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  addItem(_username: string | null | undefined, itemData: BookmarkPayload) {
    const result = bookmarkWriteService.add(itemData)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  addCategory(_username: string | null | undefined, categoryData: CategoryPayload) {
    const result = categoryWriteService.add(categoryData)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  updateCategory(
    _username: string | null | undefined,
    categoryId: IdLike,
    updateData: CategoryPayload | BookmarkPayload
  ) {
    const result = categoryWriteService.update(categoryId, updateData)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  deleteCategory(_username: string | null | undefined, categoryId: IdLike) {
    const result = categoryWriteService.delete(categoryId)
    if (result) {
      invalidateBookmarkCaches()
    }
    return result
  },

  reorderCategories(_username: string | null | undefined, orderedIds: IdLike[]) {
    const result = categoryWriteService.reorder(orderedIds)
    if (Array.isArray(result) && result.length > 0) {
      invalidateBookmarkCaches()
    }
    return result
  }
}
