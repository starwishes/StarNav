import { DEFAULT_ADMIN_NAME } from '../../config/index.js'
import { errors } from '../../utils/errors.js'
import { normalizeOptionalUrl } from '../../../shared/security/urlSafety.js'
import { categoryReadService } from './categoryReadService.js'
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

const resolveUsername = (username: UsernameLike) => username || DEFAULT_ADMIN_NAME

/** POST /data 仅允许全量导入/清理/替换语义（兼容历史中文 action） */
const BULK_DATA_ACTIONS = new Set(['import', 'clear', 'replace', '数据导入/清理'])

const normalizeBulkPayload = (payload: BulkDataContent = {}) => {
  const content = payload.content || payload

  const items = ((content.items || []) as Array<Record<string, unknown>>).map((item) => {
    // 与增量路径一致：仅允许 http(s) URL，javascript: 等非 http(s) 方案直接拒绝，
    // 防止被原样入库（存储型 XSS）。合法 URL 原样保留，不做重写。
    // 注意：这里不做归一化去重——服务端去重键是 items.url UNIQUE（精确字符串），
    // 与前端 useImportExport 的 normalizeUrl 合并去重口径差异见第 33 轮台账结论。
    const normalizedUrl = normalizeOptionalUrl(String(item.url ?? ''))
    if (!normalizedUrl) {
      throw errors.badRequest(`无效的 URL 格式: ${String(item.url).slice(0, 80)}`)
    }
    return applyLegacyPrivateFlag({ ...item, url: normalizedUrl })
  })

  const categories = ((content.categories || []) as Array<Record<string, unknown>>).map(
    applyLegacyPrivateFlag
  )

  return {
    categories,
    items,
    action: content.action || payload.action || ''
  }
}

/**
 * 旧版/第三方 JSON 的 private 布尔标记兼容：本数据模型无 private 列（可见性=level，
 * 0=游客可见）。private:true 视为**权威可见性位**：显式 level:0 与 private:true 冲突
 * （0=游客可见），仍提升为 level 1（USER，仅登录用户可见），防止私密书签/分类静默变
 * 公开（第 25 轮盲审 M2）；显式 level≥1 保留原值。注意 Joi 对缺失 level 会填默认 0，
 * 无法区分"显式 0"与"缺省 0"，故统一按 level<1 提升（第 26 轮审查明确该语义并补边界）。
 */
const applyLegacyPrivateFlag = <T extends Record<string, unknown>>(row: T): T => {
  if (row.private !== true) {
    return row
  }

  const level = Number(row.level ?? 0)
  return !Number.isFinite(level) || level < 1 ? { ...row, level: 1 } : row
}

const isUniqueConstraintError = (error: unknown) => {
  const err = error as { code?: string; message?: string } | null | undefined
  return err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || !!err?.message?.includes('unique')
}

const normalizeBookmarkPayload = (
  payload: BookmarkPayload = {},
  { includeDefaults = false }: { includeDefaults?: boolean } = {}
) => {
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
    const { categories, items, action } = normalizeBulkPayload(payload)

    if (!BULK_DATA_ACTIONS.has(action)) {
      throw errors.badRequest(
        'POST /data 仅用于全量导入/清理/替换，请提供 action=import|clear|replace'
      )
    }

    // saveData 失败时直接抛错（500），无需布尔握手
    bookmarkMutationService.saveData({
      categories,
      items
    })

    logger.info(`数据保存成功: ${normalizedUsername} (${action})`)

    return successPayload(undefined, '数据保存成功')
  },

  trackClick(itemId: IdLike, level: number | string | null | undefined = 0) {
    const updatedItem = bookmarkMutationService.trackClick(itemId, level)

    if (!updatedItem) {
      // 不可见（等级/分类权限不足）或不存在，统一按未找到处理，不暴露存在性
      throw errors.notFound('书签未找到')
    }

    return { item: updatedItem }
  },

  addBookmark(payload: BookmarkPayload = {}) {
    const bookmarkPayload = normalizeBookmarkPayload(payload, { includeDefaults: true })

    if (!validators.isValidUrl(bookmarkPayload.url)) {
      throw errors.badRequest('无效的 URL 格式')
    }

    const targetCategoryId = Number(bookmarkPayload.categoryId ?? 0)
    if (targetCategoryId > 0 && !categoryReadService.exists(targetCategoryId)) {
      throw errors.badRequest('分类不存在')
    }

    try {
      const newItem = bookmarkMutationService.addItem(bookmarkPayload)

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

  createCategory(payload: CategoryPayload = {}) {
    const categoryPayload = normalizeCategoryCreatePayload(payload)

    const newCategory = bookmarkMutationService.addCategory(categoryPayload)

    if (!newCategory) {
      throw errors.internal('分类创建失败')
    }

    return { item: newCategory }
  },

  updateCategory(categoryId: IdLike, updateData: CategoryPayload = {}) {
    const categoryPayload = normalizeCategoryUpdatePayload(updateData)

    const updatedCategory = bookmarkMutationService.updateCategory(categoryId, categoryPayload)

    if (!updatedCategory) {
      throw errors.notFound('更新失败或分类不存在')
    }

    return { item: updatedCategory }
  },

  deleteCategory(categoryId: IdLike) {
    const result = bookmarkMutationService.deleteCategory(categoryId)

    if (!result) {
      throw errors.notFound('删除失败或分类不存在')
    }

    return successPayload(undefined, '删除成功')
  },

  reorderCategories(payload: CategoryReorderPayload = {}) {
    const reorderPayload = normalizeCategoryReorderPayload(payload)

    const categories = bookmarkMutationService.reorderCategories(reorderPayload.orderedIds)

    if (categories === null) {
      throw errors.internal('分类排序失败')
    }

    return { categories }
  },

  updateBookmark(itemId: IdLike, updateData: BookmarkPayload = {}) {
    const normalizedPayload = normalizeBookmarkPayload(updateData)

    if (normalizedPayload.url !== undefined && !validators.isValidUrl(normalizedPayload.url)) {
      throw errors.badRequest('无效的 URL 格式')
    }

    if (normalizedPayload.categoryId !== undefined) {
      const targetCategoryId = Number(normalizedPayload.categoryId)
      if (targetCategoryId > 0 && !categoryReadService.exists(targetCategoryId)) {
        throw errors.badRequest('分类不存在')
      }
    }

    const updatedItem = bookmarkMutationService.updateItem(itemId, normalizedPayload)

    if (!updatedItem) {
      throw errors.notFound('更新失败或书签不存在')
    }

    return { item: updatedItem }
  },

  deleteBookmark(itemId: IdLike) {
    const success = bookmarkMutationService.deleteItem(itemId)

    if (!success) {
      throw errors.notFound('删除失败或书签不存在')
    }

    return successPayload(undefined, '删除成功')
  },

  moveBookmark(itemId: IdLike, payload: BookmarkMovePayload = {}) {
    const movePayload = normalizeBookmarkMovePayload(payload)

    const updatedItem = bookmarkMutationService.moveItem(
      itemId,
      movePayload.categoryId,
      movePayload.targetIndex
    )

    if (!updatedItem) {
      throw errors.notFound('移动失败或书签不存在')
    }

    return { item: updatedItem }
  },

  batchMoveBookmarks(payload: BookmarkBatchMovePayload = {}) {
    const movePayload = normalizeBookmarkBatchMovePayload(payload)

    const items = bookmarkMutationService.batchMoveItems(movePayload.ids, movePayload.categoryId)

    return {
      count: items.length,
      items
    }
  },

  batchDeleteBookmarks(payload: BookmarkBatchPayload = {}) {
    const deletePayload = normalizeBookmarkBatchPayload(payload)

    const deletedCount = bookmarkMutationService.batchDeleteItems(deletePayload.ids)

    return {
      count: deletedCount
    }
  }
}
