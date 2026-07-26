import type { BookmarkPayload, DbRow, IdLike } from '../../types/domain.js'
import type { BookmarkItemRow, ItemCategoryRefRow, MaxIdRow } from '../../types/sqliteRows.js'
import { getDb, forceCheckpoint, backupDatabase } from '../database/database.js'
import { logger } from '../../utils/logger.js'
import {
  mapBookmarkRow,
  normalizeApiCategoryId,
  normalizeDbCategoryId
} from './recordTransforms.js'
import {
  buildPlaceholders,
  clampIndex,
  getNextSortOrder,
  normalizeCategoryItems,
  resequenceCategoryItems,
  selectCategoryItems,
  type SqliteDb
} from './bookmarkWriteOrder.js'

type IdList = IdLike[]

export const bookmarkWriteService = {
  add(itemData: BookmarkPayload) {
    const db = getDb()
    const name = itemData.name || 'Untitled'
    const description = itemData.description || ''
    const icon = itemData.icon || ''
    const categoryId = normalizeDbCategoryId(itemData.categoryId)
    const pinned = !!itemData.pinned
    const level = Number(itemData.level || 0)

    const maxId = db.prepare<MaxIdRow>('SELECT MAX(id) as maxId FROM items').get()?.maxId || 0
    const newId = maxId + 1
    const sortOrder = getNextSortOrder(db, categoryId)

    db.prepare(
      `
        INSERT INTO items (id, name, url, description, icon, category_id, pinned, level, click_count, sort_order, last_visited)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `
    ).run(
      newId,
      name,
      itemData.url,
      description,
      icon,
      categoryId,
      pinned ? 1 : 0,
      level,
      sortOrder,
      new Date().toISOString()
    )

    const newItem = {
      id: newId,
      name,
      url: itemData.url,
      description,
      icon,
      categoryId: normalizeApiCategoryId(categoryId),
      pinned,
      level,
      clickCount: 0
    }

    logger.info(`书签添加成功: ${newItem.name}`)
    forceCheckpoint()
    return newItem
  },

  update(itemId: IdLike, updateData: BookmarkPayload) {
    const db = getDb()
    const id = Number(itemId)

    try {
      backupDatabase()

      const currentItem = db.prepare<BookmarkItemRow>('SELECT * FROM items WHERE id = ?').get(id)
      if (!currentItem) {
        return null
      }

      const fields: string[] = []
      const values: unknown[] = []

      if (updateData.name !== undefined) {
        fields.push('name = ?')
        values.push(updateData.name)
      }
      if (updateData.url !== undefined) {
        fields.push('url = ?')
        values.push(updateData.url)
      }
      if (updateData.description !== undefined) {
        fields.push('description = ?')
        values.push(updateData.description)
      }
      if (updateData.categoryId !== undefined) {
        const nextCategoryId = normalizeDbCategoryId(updateData.categoryId)
        fields.push('category_id = ?')
        values.push(nextCategoryId)
      }
      if (updateData.level !== undefined) {
        fields.push('level = ?')
        values.push(Number(updateData.level))
      }
      if (updateData.icon !== undefined) {
        fields.push('icon = ?')
        values.push(updateData.icon)
      }
      if (updateData.pinned !== undefined) {
        fields.push('pinned = ?')
        values.push(updateData.pinned ? 1 : 0)
      }

      if (updateData.categoryId !== undefined) {
        const nextCategoryId = normalizeDbCategoryId(updateData.categoryId)
        const currentCategoryId = normalizeDbCategoryId(currentItem.category_id)
        if (nextCategoryId !== currentCategoryId) {
          const nextSortOrder = getNextSortOrder(db, nextCategoryId)
          fields.push('sort_order = ?')
          values.push(Number(nextSortOrder))
        }
      }

      if (fields.length === 0) return null

      values.push(id)
      const sql = `UPDATE items SET ${fields.join(', ')} WHERE id = ?`
      const result = db.prepare(sql).run(...values)

      if (result.changes > 0) {
        logger.info(`书签更新成功: ID ${id}`)
        const item = db.prepare<BookmarkItemRow>('SELECT * FROM items WHERE id = ?').get(id)
        return mapBookmarkRow(item, { includeSortOrder: true })
      }
      return null
    } catch (error) {
      logger.error(`书签更新失败: ID ${id}`, error)
      return null
    }
  },

  delete(itemId: IdLike) {
    try {
      const db = getDb()
      backupDatabase()

      const result = db.prepare('DELETE FROM items WHERE id = ?').run(itemId)

      if (result.changes > 0) {
        logger.info(`书签删除成功: ID ${itemId}`)
        forceCheckpoint()
        return true
      }

      logger.warn(`书签删除失败: 未找到 ID ${itemId}`)
      return false
    } catch (error) {
      logger.error(`书签删除失败: ID ${itemId}`, error)
      return false
    }
  },

  move(itemId: IdLike, targetCategoryId: IdLike, targetIndex: IdLike) {
    const db = getDb()
    const id = Number(itemId)
    const normalizedTargetCategoryId = normalizeDbCategoryId(targetCategoryId)

    try {
      // Skip full-file backup on reorder — it blocks for seconds and the UI
      // already optimistically updates. Scheduled backups cover durability.
      const currentItem = db.prepare<BookmarkItemRow>('SELECT * FROM items WHERE id = ?').get(id)
      if (!currentItem) {
        return null
      }

      const currentCategoryId = normalizeDbCategoryId(currentItem.category_id)

      const transaction = db.transaction(() => {
        if (currentCategoryId === normalizedTargetCategoryId) {
          const orderedIds = selectCategoryItems(db, normalizedTargetCategoryId).map((item) =>
            Number(item.id)
          )
          const sourceIndexInCategory = orderedIds.indexOf(id)
          const itemIds = orderedIds.filter((existingId) => existingId !== id)

          let insertAt = Number(targetIndex)
          if (!Number.isFinite(insertAt) || insertAt < 0) {
            insertAt = 0
          }

          // Keep "insert before hovered item" semantics after removing the source.
          if (sourceIndexInCategory >= 0 && sourceIndexInCategory < insertAt) {
            insertAt -= 1
          }

          itemIds.splice(clampIndex(insertAt, itemIds.length), 0, id)
          resequenceCategoryItems(db, normalizedTargetCategoryId, itemIds)
          return
        }

        const sourceItemIds = selectCategoryItems(db, currentCategoryId)
          .map((item) => Number(item.id))
          .filter((existingId) => existingId !== id)
        const targetItemIds = selectCategoryItems(db, normalizedTargetCategoryId)
          .map((item) => Number(item.id))
          .filter((existingId) => existingId !== id)

        targetItemIds.splice(clampIndex(targetIndex, targetItemIds.length), 0, id)

        resequenceCategoryItems(db, currentCategoryId, sourceItemIds)
        resequenceCategoryItems(db, normalizedTargetCategoryId, targetItemIds)
      })

      transaction()
      logger.info(`书签移动成功: ID ${id}`)

      const updatedItem = db.prepare<BookmarkItemRow>('SELECT * FROM items WHERE id = ?').get(id)
      return mapBookmarkRow(updatedItem, { includeSortOrder: true })
    } catch (error) {
      logger.error(`书签移动失败: ID ${id}`, error)
      return null
    }
  },

  batchMove(itemIds: IdList, targetCategoryId: IdLike) {
    const db = getDb()
    const normalizedTargetCategoryId = normalizeDbCategoryId(targetCategoryId)
    const normalizedIds = [...new Set(itemIds.map((id) => Number(id)).filter((id) => Number.isInteger(id)))] as number[]

    if (normalizedIds.length === 0) {
      return []
    }

    try {
      backupDatabase()

      const placeholders = buildPlaceholders(normalizedIds)
      const existingItems = db
        .prepare<BookmarkItemRow>(`SELECT * FROM items WHERE id IN (${placeholders})`)
        .all(...normalizedIds) as Array<DbRow>
      const itemById = new Map<number, DbRow>(existingItems.map((item) => [Number(item.id), item]))
      const movedItems = normalizedIds
        .map((id) => itemById.get(id))
        .filter(
          (item): item is DbRow =>
            Boolean(item) && normalizeDbCategoryId(item?.category_id) !== normalizedTargetCategoryId
        )

      if (movedItems.length === 0) {
        return []
      }

      const movedIdSet = new Set(movedItems.map((item) => Number(item.id)))
      const sourceCategoryIds = [
        ...new Set(
          movedItems
            .map((item) => normalizeDbCategoryId(item.category_id))
            .filter((categoryId) => categoryId !== normalizedTargetCategoryId)
        )
      ]

      const transaction = db.transaction(() => {
        sourceCategoryIds.forEach((sourceCategoryId) => {
          const sourceItemIds = selectCategoryItems(db, sourceCategoryId)
            .map((item) => Number(item.id))
            .filter((id) => !movedIdSet.has(id))

          resequenceCategoryItems(db, sourceCategoryId, sourceItemIds)
        })

        const targetItemIds = selectCategoryItems(db, normalizedTargetCategoryId)
          .map((item) => Number(item.id))
          .filter((id) => !movedIdSet.has(id))

        resequenceCategoryItems(db, normalizedTargetCategoryId, [
          ...targetItemIds,
          ...movedItems.map((item) => Number(item.id))
        ])
      })

      transaction()
      forceCheckpoint()
      logger.info(`书签批量移动成功: ${movedItems.length} 项`)

      return movedItems
        .map((item) => db.prepare<BookmarkItemRow>('SELECT * FROM items WHERE id = ?').get(Number(item.id)))
        .map((item) => mapBookmarkRow(item, { includeSortOrder: true }))
    } catch (error) {
      logger.error('书签批量移动失败', error)
      return null
    }
  },

  batchDelete(itemIds: IdList) {
    const db = getDb()
    const normalizedIds = [...new Set(itemIds.map((id) => Number(id)).filter((id) => Number.isInteger(id)))] as number[]

    if (normalizedIds.length === 0) {
      return 0
    }

    try {
      backupDatabase()

      const placeholders = buildPlaceholders(normalizedIds)
      const existingItems = db
        .prepare<ItemCategoryRefRow>(`SELECT id, category_id FROM items WHERE id IN (${placeholders})`)
        .all(...normalizedIds)

      if (existingItems.length === 0) {
        return 0
      }

      const affectedCategoryIds = [
        ...new Set(existingItems.map((item) => normalizeDbCategoryId(item.category_id)))
      ]

      const transaction = db.transaction(() => {
        db.prepare(`DELETE FROM items WHERE id IN (${placeholders})`).run(...normalizedIds)
        affectedCategoryIds.forEach((categoryId) => {
          normalizeCategoryItems(db, categoryId)
        })
      })

      transaction()
      forceCheckpoint()
      logger.info(`书签批量删除成功: ${existingItems.length} 项`)
      return existingItems.length
    } catch (error) {
      logger.error('书签批量删除失败', error)
      return null
    }
  },

  trackClick(itemId: IdLike) {
    const db = getDb()
    const id = Number(itemId)

    try {
      const result = db
        .prepare(
          `
            UPDATE items
            SET click_count = click_count + 1, last_visited = datetime('now')
            WHERE id = ?
          `
        )
        .run(id)

      if (result.changes > 0) {
        const item = db.prepare<BookmarkItemRow>('SELECT * FROM items WHERE id = ?').get(id)
        return mapBookmarkRow(item, { includeSortOrder: true })
      }
      return null
    } catch (error) {
      logger.error(`点击统计失败: ${itemId}`, error)
      return null
    }
  },

  bulkInsert(items: Array<BookmarkPayload & { id?: IdLike; clickCount?: number; lastVisited?: string | null }>, db: SqliteDb) {
    const insertItem = db.prepare(`
      INSERT INTO items (id, name, url, description, icon, category_id, pinned, level, click_count, last_visited, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    items.forEach((item, index) => {
      insertItem.run(
        Number(item.id),
        item.name || '',
        item.url || '',
        item.description || '',
        item.icon || '',
        normalizeDbCategoryId(item.categoryId),
        item.pinned ? 1 : 0,
        Number(item.level || 0),
        Number(item.clickCount || 0),
        item.lastVisited || null,
        index
      )
    })
  }
}
