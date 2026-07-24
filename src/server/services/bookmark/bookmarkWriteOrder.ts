import type { IdLike } from '../../types/domain.js'
import type { ItemIdRow, NextSortOrderRow } from '../../types/sqliteRows.js'
import type { getDb } from '../database/database.js'

export type SqliteDb = ReturnType<typeof getDb>

export const selectCategoryItems = (db: SqliteDb, categoryId: number | null) => {
  if (categoryId === null) {
    return db
      .prepare<ItemIdRow>('SELECT id FROM items WHERE category_id IS NULL ORDER BY sort_order, id')
      .all()
  }

  return db
    .prepare<ItemIdRow>('SELECT id FROM items WHERE category_id = ? ORDER BY sort_order, id')
    .all(categoryId)
}

export const resequenceCategoryItems = (
  db: SqliteDb,
  categoryId: number | null,
  itemIds: number[]
) => {
  const updateItemPosition = db.prepare(
    'UPDATE items SET sort_order = ?, category_id = ? WHERE id = ?'
  )

  itemIds.forEach((id, index) => {
    updateItemPosition.run(index, categoryId, id)
  })
}

export const normalizeCategoryItems = (db: SqliteDb, categoryId: number | null) => {
  const itemIds = selectCategoryItems(db, categoryId).map((item) => Number(item.id))
  resequenceCategoryItems(db, categoryId, itemIds)
}

export const clampIndex = (value: IdLike, max: number) =>
  Math.max(0, Math.min(Number(value), max))

export const buildPlaceholders = (values: unknown[]) => values.map(() => '?').join(', ')

export const getNextSortOrder = (db: SqliteDb, categoryId: number | null) => {
  if (categoryId === null) {
    return (
      db
        .prepare<NextSortOrderRow>(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 as nextSortOrder FROM items WHERE category_id IS NULL'
        )
        .get()?.nextSortOrder || 0
    )
  }

  return (
    db
      .prepare<NextSortOrderRow>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 as nextSortOrder FROM items WHERE category_id = ?'
      )
      .get(categoryId)?.nextSortOrder || 0
  )
}
