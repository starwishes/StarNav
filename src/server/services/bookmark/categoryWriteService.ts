import { forceCheckpoint, getDb } from '../database/database.js'
import { backupDatabaseThrottled } from '../database/backupThrottle.js'
import { logger } from '../../utils/logger.js'
import { ApiError, errors } from '../../utils/errors.js'
import { mapCategoryRow, normalizeDbParentId } from './recordTransforms.js'
import type { CategoryPayload, IdLike } from '../../types/domain.js'
import type { CategoryIdRow, CategoryRow, CountRow } from '../../types/sqliteRows.js'

type SqliteDb = ReturnType<typeof getDb>
type IdList = IdLike[]
type ParentIdRow = { parent_id?: number | null }

const selectCategoryIds = (db: SqliteDb) =>
  db
    .prepare<CategoryIdRow>('SELECT id FROM categories ORDER BY sort_order, id')
    .all()
    .map((row) => Number(row.id))

/**
 * 单分类 parentId 环校验：候选父分类不能是自身，也不能是自己的子孙。
 * 沿候选父分类的祖先链向上查，一旦遇到 categoryId 说明候选父分类在其子树内，
 * 形成环会令 buildCategoryTree 无法把环上节点挂到任何根，导致整棵子树（含书签）静默消失。
 */
const assertValidCategoryParent = (db: SqliteDb, categoryId: number, parentId: number | null) => {
  if (parentId === null) {
    return
  }
  if (parentId === categoryId) {
    throw errors.badRequest('分类不能将自身设为父分类')
  }

  const seen = new Set<number>()
  let cursor: number = parentId
  while (cursor > 0) {
    if (cursor === categoryId) {
      throw errors.badRequest('分类不能移动到自己的子孙分类下（会形成环）')
    }
    // 历史脏数据可能已存在环：遇到重复节点即停止，不再继续深入
    if (seen.has(cursor)) {
      return
    }
    seen.add(cursor)
    const row = db.prepare<ParentIdRow>('SELECT parent_id FROM categories WHERE id = ?').get(cursor)
    if (!row) {
      return
    }
    const nextCursor = normalizeDbParentId(row.parent_id)
    if (nextCursor === null) {
      return
    }
    cursor = nextCursor
  }
}

/**
 * 增量写校验：parentId 非 null 时父分类必须已存在（add/update 是单条增量写，
 * 悬空父 id 会让新分类在树构建时无法挂载而静默缺失）。
 * bulkInsert 导入不需要该校验：导入是整组替换，父引用可指向同组内待插入的分类。
 */
const assertParentCategoryExists = (db: SqliteDb, parentId: number) => {
  const row = db.prepare<CategoryIdRow>('SELECT id FROM categories WHERE id = ?').get(parentId)
  if (!row) {
    throw errors.badRequest('父分类不存在')
  }
}

/**
 * 导入（bulkInsert）的整组分类环校验：在内存中对 parentId 引用图做 DFS，
 * 检测自引用与 A→B→A 式环。导入是全量替换（saveData 先 DELETE 再 INSERT），
 * 环数据入库后同样会导致前端树构建丢子树，因此在写入前拒绝。
 */
const assertNoCategoryCycle = (categories: Array<CategoryPayload & { id?: IdLike }>) => {
  const parentById = new Map<number, number | null>()
  for (const category of categories) {
    const id = Number(category.id)
    if (!Number.isInteger(id) || id <= 0) {
      continue
    }
    parentById.set(id, normalizeDbParentId(category.parentId))
  }

  const visiting = new Set<number>()
  const visit = (id: number) => {
    if (visiting.has(id)) {
      throw errors.badRequest('导入的分类数据存在父分类环引用（分类互为父子）')
    }
    const parent = parentById.get(id)
    if (parent == null) {
      return
    }
    visiting.add(id)
    if (parentById.has(parent)) {
      visit(parent)
    }
    visiting.delete(id)
  }

  for (const id of parentById.keys()) {
    visit(id)
  }
}

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
      if (parentId !== null) {
        assertParentCategoryExists(db, parentId)
      }
      // categories.id 为 INTEGER PRIMARY KEY（无 AUTOINCREMENT），SQLite 自动分配 rowid，
      // 无需手动 SELECT MAX(id)+1（后者在并发写下还有重复 id 风险），与 bookmarkWriteService 一致。
      const sortOrder =
        db.prepare<CountRow>('SELECT COUNT(*) as count FROM categories').get()?.count ?? 0

      const result = db
        .prepare(
          `
          INSERT INTO categories (name, icon, level, sort_order, parent_id)
          VALUES (?, ?, ?, ?, ?)
        `
        )
        .run(name, icon, level, sortOrder, parentId)
      const newId = Number(result.lastInsertRowid)

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
      // 领域校验错误（400）直接透传（父分类不存在等），不按“创建失败”吞掉
      if (error instanceof ApiError) throw error
      logger.error('分类创建失败', error)
      return null
    }
  },

  update(categoryId: IdLike, updateData: CategoryPayload) {
    const db = getDb()
    const id = Number(categoryId)

    try {
      // 写前整库备份（VACUUM INTO 一致快照）已改为 5s 节流，避免频繁写操作时同步阻塞事件循环；
      // 被节流跳过的备份由后续写操作补上，保证最终一致。
      backupDatabaseThrottled()
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
        const parentId = normalizeDbParentId(updateData.parentId)
        // 父分类存在性 + 环校验均依赖库内数据，无法用 Joi 纯 schema 表达，放在服务层做领域校验
        if (parentId !== null) {
          assertParentCategoryExists(db, parentId)
        }
        assertValidCategoryParent(db, id, parentId)
        fields.push('parent_id = ?')
        values.push(parentId)
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
      // 领域校验错误（400）直接透传，不按“更新失败”记日志
      if (error instanceof ApiError) throw error
      // 真实数据库异常向上抛出（500），不要误报为“未找到”
      logger.error(`分类更新失败: ID ${id}`, error)
      throw error
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

      backupDatabaseThrottled()

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
      // 真实数据库异常向上抛出（500），不要误报为“未找到”
      logger.error(`分类删除失败: ID ${id}`, error)
      throw error
    }
  },

  reorder(orderedIds: IdList) {
    const db = getDb()
    const normalizedIds = [...new Set(orderedIds.map((id) => Number(id)).filter(Number.isInteger))]

    if (normalizedIds.length === 0) {
      return []
    }

    try {
      // 整库备份已改为 5s 节流（见 backupThrottle.ts）。
      backupDatabaseThrottled()

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
      // 真实数据库异常向上抛出（500），不要误报为失败/空结果
      logger.error('分类排序失败', error)
      throw error
    }
  },

  bulkInsert(categories: Array<CategoryPayload & { id?: IdLike }>, db: SqliteDb) {
    // 导入为全量替换语义，先拒绝环数据，避免成环节点从首页静默消失
    assertNoCategoryCycle(categories)

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
