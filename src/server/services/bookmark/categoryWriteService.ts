import { forceCheckpoint, backupDatabase, getDb } from '../database/database.js'
import { logger } from '../../utils/logger.js'
import { mapCategoryRow, normalizeDbParentId } from './recordTransforms.js'
import type { CategoryPayload, IdLike } from '../../types/domain.js'
import type { CategoryIdRow, CategoryRow, CountRow, MaxIdRow } from '../../types/sqliteRows.js'

type SqliteDb = ReturnType<typeof getDb>
type IdList = IdLike[]

const selectCategoryIds = (db: SqliteDb) =>
  db
    .prepare<CategoryIdRow>('SELECT id FROM categories ORDER BY sort_order, id')
    .all()
    .map((row) => Number(row.id))

const resequenceCategories = (db: SqliteDb, categoryIds: number[]) => {
  const updateCategoryPosition = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?')

  categoryIds.forEach((id, index) => {
    updateCategoryPosition.run(index, id)
  })
}

export const categoryWriteService = {
  add(categoryData: CategoryPayload) {
    const db = getDb()
    const name = categoryData.name || 'New Category'
    const icon = categoryData.icon || ''
    const level = Number(categoryData.level || 0)
    const parentId = normalizeDbParentId(categoryData.parentId)

    try {
      const maxId = db.prepare<MaxIdRow>('SELECT MAX(id) as maxId FROM categories').get()?.maxId || 0
      const newId = maxId + 1
      const sortOrder = db.prepare<CountRow>('SELECT COUNT(*) as count FROM categories').get()?.count ?? 0

      db.prepare(
        `
          INSERT INTO categories (id, name, icon, level, sort_order, parent_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      ).run(newId, name, icon, level, sortOrder, parentId)

      const newCategory = {
        id: newId,
        name,
        icon,
        level,
        parentId
      }

      logger.info(`分类创建成功: ${newCategory.name}`)
      return newCategory
    } catch (error) {
      logger.error('分类创建失败', error)
      return null
    }
  },

  update(categoryId: IdLike, updateData: CategoryPayload) {
    const db = getDb()
    const id = Number(categoryId)

    try {
      backupDatabase()
      const fields: string[] = []
      const values: unknown[] = []

      if (updateData.name !== undefined) {
        fields.push('name = ?')
        values.push(updateData.name)
      }
      if (updateData.icon !== undefined) {
        fields.push('icon = ?')
        values.push(updateData.icon)
      }
      if (updateData.level !== undefined) {
        fields.push('level = ?')
        values.push(Number(updateData.level))
      }
      if (updateData.parentId !== undefined) {
        fields.push('parent_id = ?')
        values.push(normalizeDbParentId(updateData.parentId))
      }

      if (fields.length === 0) return null

      values.push(id)
      const sql = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`
      const result = db.prepare(sql).run(...values)

      if (result.changes > 0) {
        logger.info(`分类更新成功: ID ${id}`)
        const category = db.prepare<CategoryRow>('SELECT * FROM categories WHERE id = ?').get(id)
        return mapCategoryRow(category)
      }
      return null
    } catch (error) {
      logger.error(`分类更新失败: ID ${id}`, error)
      return null
    }
  },

  delete(categoryId: IdLike) {
    const db = getDb()
    const id = Number(categoryId)

    try {
      const category = db.prepare<CategoryRow>('SELECT * FROM categories WHERE id = ?').get(id)
      if (!category) {
        return null
      }

      backupDatabase()

      const parentId = normalizeDbParentId(category.parent_id)
      const targetCategoryId = parentId ?? 0
      const targetDbCategoryId = parentId ?? null

      const transaction = db.transaction(() => {
        db.prepare('UPDATE categories SET parent_id = ? WHERE parent_id = ?').run(parentId, id)
        db.prepare('UPDATE items SET category_id = ? WHERE category_id = ?').run(
          targetDbCategoryId,
          id
        )
        return db.prepare('DELETE FROM categories WHERE id = ?').run(id)
      })

      const result = transaction()
      if (result.changes <= 0) {
        return null
      }

      forceCheckpoint()
      logger.info(`分类删除成功: ID ${id}`)
      return {
        id,
        parentId,
        targetCategoryId
      }
    } catch (error) {
      logger.error(`分类删除失败: ID ${id}`, error)
      return null
    }
  },

  reorder(orderedIds: IdList) {
    const db = getDb()
    const normalizedIds = [...new Set(orderedIds.map((id) => Number(id)).filter(Number.isInteger))]

    if (normalizedIds.length === 0) {
      return []
    }

    try {
      backupDatabase()

      const existingIds = selectCategoryIds(db)
      const seenIds = new Set(existingIds)
      const prioritizedIds = normalizedIds.filter((id) => seenIds.has(id))

      if (prioritizedIds.length === 0) {
        return []
      }

      const remainingIds = existingIds.filter((id) => !prioritizedIds.includes(id))
      const finalOrder = [...prioritizedIds, ...remainingIds]

      const transaction = db.transaction(() => {
        resequenceCategories(db, finalOrder)
      })

      transaction()
      forceCheckpoint()
      logger.info(`分类排序成功: ${prioritizedIds.length} 项`)

      return db
        .prepare<CategoryRow>('SELECT * FROM categories ORDER BY sort_order, id')
        .all()
        .map((category) => mapCategoryRow(category, { includeSortOrder: true }))
    } catch (error) {
      logger.error('分类排序失败', error)
      return null
    }
  },

  bulkInsert(categories: Array<CategoryPayload & { id?: IdLike }>, db: SqliteDb) {
    const insertCategory = db.prepare(`
      INSERT INTO categories (id, name, icon, level, sort_order, parent_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    categories.forEach((category, index) => {
      const parentId = normalizeDbParentId(category.parentId)

      insertCategory.run(
        Number(category.id),
        category.name || '',
        category.icon || '',
        Number(category.level || 0),
        index,
        parentId
      )
    })
  }
}
