import type { Request, Response } from 'express'
import { bookmarkQueryService } from '../services/bookmark/bookmarkQueryService.js'
import { bookmarkCommandService } from '../services/bookmark/bookmarkCommandService.js'
import { respondWithService } from '../utils/controllerResponder.js'
import {
  bookmarkBatchDeleteSchema,
  bookmarkBatchMoveSchema,
  bookmarkCreateSchema,
  bookmarkMoveSchema,
  bookmarkUpdateSchema,
  categoryCreateSchema,
  categoryReorderSchema,
  categoryUpdateSchema,
  dataSchema,
  validatePayload
} from '../validation.js'
import type {
  BookmarkBatchMovePayload,
  BookmarkBatchPayload,
  BookmarkMovePayload,
  BookmarkPayload,
  BulkDataContent,
  CategoryPayload,
  CategoryReorderPayload
} from '../types/domain.js'

const resolveUsername = (req: Request) => {
  const user = (req as Request & { user?: { username?: string; level?: number } }).user
  if (!user?.username) {
    // 所有使用 resolveUsername 的路由都挂在 authenticate 之后；缺失说明
    // 中间件链或上下文装配有 bug，此时静默回退到 DEFAULT_ADMIN_NAME 会
    // 掩盖问题，甚至可能造成越权写入，因此直接抛错。
    throw new Error('认证上下文缺失')
  }
  return user.username
}

const resolveUserLevel = (req: Request) => {
  const level = (req as Request & { user?: { level?: number } }).user?.level
  return level == null ? 0 : level
}

/** Express params/query may be string | string[]; normalize to a single string */
const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  if (value == null) return fallback
  return String(value)
}

/**
 * 书签控制器 (浏览器插件专用)
 */
export const bookmarkController = {
  // GET /api/data - 获取数据 (原有逻辑，由插件调用或前端调用)
  getData: (req: Request, res: Response) => {
    return respondWithService(res, () => bookmarkQueryService.getData(resolveUserLevel(req)))
  },

  // POST /api/data - 全量保存 (原有逻辑)
  saveData: (req: Request, res: Response) => {
    return respondWithService(res, () => {
      const validatedPayload = validatePayload<BulkDataContent>(
        dataSchema,
        req.body,
        '数据格式不正确'
      )
      return bookmarkCommandService.saveData(resolveUsername(req), validatedPayload)
    })
  },

  // POST /sites/:id/click - 点击次数统计
  trackClick: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.trackClick(asString(req.params.id), resolveUserLevel(req))
    )
  },

  // POST /api/bookmark - 添加单个书签 (浏览器插件)
  addBookmark: (req: Request, res: Response) => {
    return respondWithService(res, () => {
      const validatedPayload = validatePayload<BookmarkPayload>(
        bookmarkCreateSchema,
        req.body,
        '书签参数不正确'
      )
      return bookmarkCommandService.addBookmark(validatedPayload)
    })
  },

  // GET /api/bookmark/search - 搜索书签 (浏览器插件)
  searchBookmarks: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkQueryService.searchBookmarks(
        resolveUserLevel(req),
        asString(req.query.q),
        asString(req.query.limit, '10')
      )
    )
  },

  // GET /categories/simple - 获取分类列表 (浏览器插件)
  getSimpleCategories: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkQueryService.getSimpleCategories(resolveUserLevel(req))
    )
  },

  // POST /category - 创建新分类 (浏览器插件)
  createCategory: (req: Request, res: Response) => {
    return respondWithService(res, () => {
      const validatedPayload = validatePayload<CategoryPayload>(
        categoryCreateSchema,
        req.body,
        '分类参数不正确'
      )
      return bookmarkCommandService.createCategory(validatedPayload)
    })
  },

  // PUT /category/:id - 更新分类
  updateCategory: (req: Request, res: Response) => {
    return respondWithService(res, () => {
      const validatedPayload = validatePayload<CategoryPayload>(
        categoryUpdateSchema,
        req.body,
        '分类更新参数不正确'
      )
      return bookmarkCommandService.updateCategory(asString(req.params.id), validatedPayload)
    })
  },

  reorderCategories: (req: Request, res: Response) => {
    return respondWithService(res, () => {
      const validatedPayload = validatePayload<CategoryReorderPayload>(
        categoryReorderSchema,
        req.body,
        '分类排序参数不正确'
      )
      return bookmarkCommandService.reorderCategories(validatedPayload)
    })
  },

  // DELETE /category/:id - 删除分类
  deleteCategory: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.deleteCategory(asString(req.params.id))
    )
  },

  // GET /bookmark/check - 检查书签是否已存在 (浏览器插件)
  checkBookmark: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkQueryService.checkBookmark(resolveUserLevel(req), asString(req.query.url))
    )
  },

  // PUT /bookmark/:id - 更新书签
  updateBookmark: (req: Request, res: Response) => {
    return respondWithService(res, () => {
      const validatedPayload = validatePayload<BookmarkPayload>(
        bookmarkUpdateSchema,
        req.body,
        '书签更新参数不正确'
      )
      return bookmarkCommandService.updateBookmark(asString(req.params.id), validatedPayload)
    })
  },

  moveBookmark: (req: Request, res: Response) => {
    return respondWithService(res, () => {
      const validatedPayload = validatePayload<BookmarkMovePayload>(
        bookmarkMoveSchema,
        req.body,
        '书签移动参数不正确'
      )
      return bookmarkCommandService.moveBookmark(asString(req.params.id), validatedPayload)
    })
  },

  batchMoveBookmarks: (req: Request, res: Response) => {
    return respondWithService(res, () => {
      const validatedPayload = validatePayload<BookmarkBatchMovePayload>(
        bookmarkBatchMoveSchema,
        req.body,
        '批量移动参数不正确'
      )
      return bookmarkCommandService.batchMoveBookmarks(validatedPayload)
    })
  },

  batchDeleteBookmarks: (req: Request, res: Response) => {
    return respondWithService(res, () => {
      const validatedPayload = validatePayload<BookmarkBatchPayload>(
        bookmarkBatchDeleteSchema,
        req.body,
        '批量删除参数不正确'
      )
      return bookmarkCommandService.batchDeleteBookmarks(validatedPayload)
    })
  },

  // DELETE /bookmark/:id - 删除书签
  deleteBookmark: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.deleteBookmark(asString(req.params.id))
    )
  }
}
