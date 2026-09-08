import type { Request, Response } from 'express'
import { USER_LEVEL } from '../../shared/constants.js'
import { systemAssetService } from '../services/system/systemAssetService.js'
import { systemHealthService } from '../services/system/systemHealthService.js'
import { systemSettingsService } from '../services/system/systemSettingsService.js'
import { respondWithService } from '../utils/controllerResponder.js'

export const systemController = {
  getHealth: (req: Request, res: Response) => {
    // /health（匿名）返回最小负载；/admin/system/health 挂在 authenticate+requireAdmin 后，
    // req.user 必为管理员 → 返回完整运行时/内存/慢查询/DB 明细（第 25/26 轮分级收口）
    const userLevel = (req as { user?: { level?: number } }).user?.level ?? 0
    return respondWithService(res, () =>
      systemHealthService.getHealth({ detailed: userLevel >= USER_LEVEL.ADMIN })
    )
  },

  getPublicSettings: (req: Request, res: Response) => {
    return respondWithService(res, () => systemSettingsService.getPublicSettings())
  },

  getAdminSettings: (req: Request, res: Response) => {
    return respondWithService(res, () => systemSettingsService.getAdminSettings())
  },

  updateAdminSettings: (req: Request, res: Response) => {
    return respondWithService(res, () => systemSettingsService.updateAdminSettings(req.body))
  },

  setBackground: (req: Request, res: Response) => {
    return respondWithService(res, () => systemSettingsService.setBackground(req.body.url))
  },

  uploadBackground: (req: Request, res: Response) => {
    return respondWithService(res, () => systemAssetService.uploadBackground(req.body.data))
  },

  uploadIcon: (req: Request, res: Response) => {
    return respondWithService(res, () => systemAssetService.uploadIcon(req.body.data))
  },

  getUploads: (req: Request, res: Response) => {
    return respondWithService(res, () => systemAssetService.getUploads())
  },

  deleteUpload: (req: Request, res: Response) => {
    const filename = Array.isArray(req.params.filename)
      ? req.params.filename[0]
      : req.params.filename
    return respondWithService(res, () => systemAssetService.deleteUpload(String(filename || '')))
  }
}
