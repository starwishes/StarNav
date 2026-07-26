import { DEFAULT_ADMIN_NAME } from '../../config/index.js'
import { errors } from '../../middleware/errorHandler.js'
import {
  bookmarkCreateSchema,
  bookmarkBatchDeleteSchema,
  bookmarkBatchMoveSchema,
  bookmarkMoveSchema,
  bookmarkUpdateSchema,
  categoryCreateSchema,
  categoryReorderSchema,
  categoryUpdateSchema,
  dataSchema
} from '../../middleware/validation.js'
import { bookmarkMutationService } from './bookmarkMutationService.js'
import { logger } from '../../utils/logger.js'
import { validators } from '../../utils/validators.js'
import { successPayload } from '../../utils/response.js'
import type {
  BookmarkBatchMovePayload,
  BookmarkBatchPayload,
  BookmarkMovePayload,
  BookmarkPayload,
  BulkDataContent,
  CategoryPayload,
  CategoryReorderPayload
} from '../../types/domain.js'

type IdLike = number | string
type UsernameLike = string | null | undefined

type JoiLikeSchema = {
  validate: (
    payload: unknown,
    options?: Record<string, unknown>
  ) => { error?: unknown; value: unknown }
}

const resolveUsername = (username: UsernameLike) => username || DEFAULT_ADMIN_NAME

/** POST /data 仅允许全量导入/清理/替换语义（兼容历史中文 action） */
const BULK_DATA_ACTIONS = new Set(['import', 'clear', 'replace', '数据导入/清理'])

const normalizeBulkPayload = (payload: BulkDataContent = {}) => {
  const content = payload.content || payload

  return {
    categories: content.categories || [],
    items: content.items || [],
    action: content.action || payload.action || ''
  }
}

const isUniqueConstraintError = (error: unknown) => {
  const err = error as { code?: string; message?: string } | null | undefined
  return err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || !!err?.message?.includes('unique')
}

const validatePayload = <T>(schema: JoiLikeSchema, payload: unknown, message: string): T => {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    convert: true
  })

  if (error) {
    throw errors.badRequest(message)
  }

  return value as T
}

const normalizeBookmarkPayload = (payload: BookmarkPayload = {}, { includeDefaults = false }: { includeDefaults?: boolean } = {}) => {
  const normalized: BookmarkPayload = {}

  if (payload.name !== undefined) {
    normalized.name = payload.name.trim()
  }

  if (payload.url !== undefined) {
    normalized.url = payload.url.trim()
  }

  if (payload.description !== undefined || includeDefaults) {
    normalized.description = payload.description || ''
  }

  if (payload.categoryId !== undefined) {
    normalized.categoryId = Number(payload.categoryId)
  }

  if (payload.icon !== undefined || includeDefaults) {
    normalized.icon = payload.icon || ''
  }

  if (payload.pinned !== undefined || includeDefaults) {
    normalized.pinned = !!payload.pinned
  }

  const level = payload.minLevel ?? payload.level
  if (level !== undefined || includeDefaults) {
    normalized.level = level ?? 0
  }

  return normalized
}

const normalizeCategoryCreatePayload = (payload: CategoryPayload = {}) => ({
  name: String(payload.name || '').trim(),
  icon: payload.icon || '',
  level: payload.minLevel ?? payload.level ?? 0,
  parentId: payload.parentId ?? null
})

const normalizeCategoryUpdatePayload = (payload: CategoryPayload = {}) => {
  const normalized: BookmarkPayload = {}

  if (payload.name !== undefined) {
    normalized.name = payload.name.trim()
  }

  if (payload.icon !== undefined) {
    normalized.icon = payload.icon || ''
  }

  if (payload.minLevel !== undefined || payload.level !== undefined) {
    normalized.level = payload.minLevel ?? payload.level ?? 0
  }

  if (payload.parentId !== undefined) {
    normalized.parentId = payload.parentId ?? null
  }

  return normalized
}

const normalizeBookmarkMovePayload = (payload: BookmarkMovePayload = {}) => ({
  categoryId: Number(payload.categoryId),
  targetIndex: Number(payload.targetIndex)
})

const normalizeBookmarkBatchPayload = (payload: BookmarkBatchPayload = {}) => ({
  ids: (payload.ids || []).map((id) => Number(id))
})

const normalizeBookmarkBatchMovePayload = (payload: BookmarkBatchMovePayload = {}) => ({
  ids: (payload.ids || []).map((id) => Number(id)),
  categoryId: Number(payload.categoryId)
})

const normalizeCategoryReorderPayload = (payload: CategoryReorderPayload = {}) => ({
  orderedIds: (payload.orderedIds || []).map((id) => Number(id))
})

export const bookmarkCommandService = {
  saveData(username: UsernameLike, payload: BulkDataContent = {}) {
    const normalizedUsername = resolveUsername(username)
    const validatedPayload = validatePayload<BulkDataContent>(dataSchema, payload, '数据格式不正确')
    const { categories, items, action } = normalizeBulkPayload(validatedPayload)

    if (!BULK_DATA_ACTIONS.has(action)) {
      throw errors.badRequest(
        'POST /data 仅用于全量导入/清理/替换，请提供 action=import|clear|replace'
      )
    }

    if (
      !bookmarkMutationService.saveData(normalizedUsername, {
        categories,
        items
      })
    ) {
      throw errors.internal('数据保存失败')
    }

    logger.info(`数据保存成功: ${normalizedUsername} (${action})`)

    return successPayload(undefined, '数据保存成功')
  },

  trackClick(itemId: IdLike) {
    const updatedItem = bookmarkMutationService.trackClick(itemId)

    if (!updatedItem) {
      throw errors.notFound('书签未找到')
    }

    return { item: updatedItem }
  },

  addBookmark(username: UsernameLike, payload: BookmarkPayload = {}) {
    const normalizedUsername = resolveUsername(username)
    const validatedPayload = validatePayload<BookmarkPayload>(bookmarkCreateSchema, payload, '书签参数不正确')
    const bookmarkPayload = normalizeBookmarkPayload(validatedPayload, { includeDefaults: true })

    if (!validators.isValidUrl(bookmarkPayload.url)) {
      throw errors.badRequest('无效的 URL 格式')
    }

    try {
      const newItem = bookmarkMutationService.addItem(normalizedUsername, bookmarkPayload)

      if (!newItem) {
        throw errors.internal('书签添加失败')
      }

            return { item: newItem }
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw errors.conflict('该 URL 书签已存在')
      }

      throw error
    }
  },

  createCategory(username: UsernameLike, payload: CategoryPayload = {}) {
    const normalizedUsername = resolveUsername(username)
    const validatedPayload = validatePayload<CategoryPayload>(categoryCreateSchema, payload, '分类参数不正确')
    const categoryPayload = normalizeCategoryCreatePayload(validatedPayload)

    const newCategory = bookmarkMutationService.addCategory(normalizedUsername, categoryPayload)

    if (!newCategory) {
      throw errors.internal('分类创建失败')
    }

    return { item: newCategory }
  },

  updateCategory(username: UsernameLike, categoryId: IdLike, updateData: CategoryPayload = {}) {
    const normalizedUsername = resolveUsername(username)
    const validatedPayload = validatePayload<CategoryPayload>(categoryUpdateSchema, updateData, '分类更新参数不正确')
    const categoryPayload = normalizeCategoryUpdatePayload(validatedPayload)

    const updatedCategory = bookmarkMutationService.updateCategory(
      normalizedUsername,
      categoryId,
      categoryPayload
    )

    if (!updatedCategory) {
      throw errors.notFound('更新失败或分类不存在')
    }

    return { item: updatedCategory }
  },

  deleteCategory(username: UsernameLike, categoryId: IdLike) {
    const normalizedUsername = resolveUsername(username)
    const result = bookmarkMutationService.deleteCategory(normalizedUsername, categoryId)

    if (!result) {
      throw errors.notFound('删除失败或分类不存在')
    }

    return successPayload(undefined, '删除成功')
  },

  reorderCategories(username: UsernameLike, payload: CategoryReorderPayload = {}) {
    const normalizedUsername = resolveUsername(username)
    const validatedPayload = validatePayload<CategoryReorderPayload>(categoryReorderSchema, payload, '分类排序参数不正确')
    const reorderPayload = normalizeCategoryReorderPayload(validatedPayload)

    const categories = bookmarkMutationService.reorderCategories(
      normalizedUsername,
      reorderPayload.orderedIds
    )

    if (categories === null) {
      throw errors.internal('分类排序失败')
    }

    return { categories }
  },

  updateBookmark(username: UsernameLike, itemId: IdLike, updateData: BookmarkPayload = {}) {
    const normalizedUsername = resolveUsername(username)
    const validatedPayload = validatePayload<BookmarkPayload>(bookmarkUpdateSchema, updateData, '书签更新参数不正确')
    const normalizedPayload = normalizeBookmarkPayload(validatedPayload)

    if (normalizedPayload.url !== undefined && !validators.isValidUrl(normalizedPayload.url)) {
      throw errors.badRequest('无效的 URL 格式')
    }

    const updatedItem = bookmarkMutationService.updateItem(
      normalizedUsername,
      itemId,
      normalizedPayload
    )

    if (!updatedItem) {
      throw errors.notFound('更新失败或书签不存在')
    }

    return { item: updatedItem }
  },

  deleteBookmark(username: UsernameLike, itemId: IdLike) {
    const normalizedUsername = resolveUsername(username)
    const success = bookmarkMutationService.deleteItem(normalizedUsername, itemId)

    if (!success) {
      throw errors.notFound('删除失败或书签不存在')
    }

    return successPayload(undefined, '删除成功')
  },

  moveBookmark(username: UsernameLike, itemId: IdLike, payload: BookmarkMovePayload = {}) {
    const normalizedUsername = resolveUsername(username)
    const validatedPayload = validatePayload<BookmarkMovePayload>(bookmarkMoveSchema, payload, '书签移动参数不正确')
    const movePayload = normalizeBookmarkMovePayload(validatedPayload)

    const updatedItem = bookmarkMutationService.moveItem(
      normalizedUsername,
      itemId,
      movePayload.categoryId,
      movePayload.targetIndex
    )

    if (!updatedItem) {
      throw errors.notFound('移动失败或书签不存在')
    }

    return { item: updatedItem }
  },

  batchMoveBookmarks(username: UsernameLike, payload: BookmarkBatchMovePayload = {}) {
    const normalizedUsername = resolveUsername(username)
    const validatedPayload = validatePayload<BookmarkBatchMovePayload>(bookmarkBatchMoveSchema, payload, '批量移动参数不正确')
    const movePayload = normalizeBookmarkBatchMovePayload(validatedPayload)

    const items = bookmarkMutationService.batchMoveItems(
      normalizedUsername,
      movePayload.ids,
      movePayload.categoryId
    )

    if (items === null) {
      throw errors.internal('批量移动失败')
    }

    return {
      count: items.length,
      items
    }
  },

  batchDeleteBookmarks(username: UsernameLike, payload: BookmarkBatchPayload = {}) {
    const normalizedUsername = resolveUsername(username)
    const validatedPayload = validatePayload<BookmarkBatchPayload>(bookmarkBatchDeleteSchema, payload, '批量删除参数不正确')
    const deletePayload = normalizeBookmarkBatchPayload(validatedPayload)

    const deletedCount = bookmarkMutationService.batchDeleteItems(
      normalizedUsername,
      deletePayload.ids
    )

    if (deletedCount === null) {
      throw errors.internal('批量删除失败')
    }

    return {
      count: deletedCount
    }
  }
}
