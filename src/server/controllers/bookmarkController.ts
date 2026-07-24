import type { Request, Response } from 'express'
import { bookmarkQueryService } from '../services/bookmark/bookmarkQueryService.js'
import { bookmarkCommandService } from '../services/bookmark/bookmarkCommandService.js'
import { DEFAULT_ADMIN_NAME } from '../config/index.js'
import { respondWithService } from '../utils/controllerResponder.js'

const resolveUsername = (req: Request) =>
  (req as Request & { user?: { username?: string; level?: number } }).user?.username ||
  DEFAULT_ADMIN_NAME

const resolveUserLevel = (req: Request) =>
  (req as Request & { user?: { level?: number } }).user?.level || 0

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
    return respondWithService(res, () =>
      bookmarkCommandService.saveData(resolveUsername(req), req.body)
    )
  },

  // POST /sites/:id/click - 点击次数统计
  trackClick: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.trackClick(asString(req.params.id))
    )
  },

  // POST /api/bookmark - 添加单个书签 (浏览器插件)
  addBookmark: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.addBookmark(resolveUsername(req), req.body)
    )
  },

  // GET /api/bookmark/search - 搜索书签 (浏览器插件)
  searchBookmarks: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkQueryService.searchBookmarks(
        resolveUsername(req),
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
    return respondWithService(res, () =>
      bookmarkCommandService.createCategory(resolveUsername(req), req.body)
    )
  },

  // PUT /category/:id - 更新分类
  updateCategory: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.updateCategory(
        resolveUsername(req),
        asString(req.params.id),
        req.body
      )
    )
  },

  reorderCategories: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.reorderCategories(resolveUsername(req), req.body)
    )
  },

  // DELETE /category/:id - 删除分类
  deleteCategory: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.deleteCategory(resolveUsername(req), asString(req.params.id))
    )
  },

  // GET /bookmark/check - 检查书签是否已存在 (浏览器插件)
  checkBookmark: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkQueryService.checkBookmark(
        resolveUsername(req),
        resolveUserLevel(req),
        asString(req.query.url)
      )
    )
  },

  // PUT /bookmark/:id - 更新书签
  updateBookmark: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.updateBookmark(
        resolveUsername(req),
        asString(req.params.id),
        req.body
      )
    )
  },

  moveBookmark: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.moveBookmark(
        resolveUsername(req),
        asString(req.params.id),
        req.body
      )
    )
  },

  batchMoveBookmarks: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.batchMoveBookmarks(resolveUsername(req), req.body)
    )
  },

  batchDeleteBookmarks: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.batchDeleteBookmarks(resolveUsername(req), req.body)
    )
  },

  // DELETE /bookmark/:id - 删除书签
  deleteBookmark: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      bookmarkCommandService.deleteBookmark(resolveUsername(req), asString(req.params.id))
    )
  }
}
