import type { Request, Response } from 'express'
import { systemAssetService } from '../services/system/systemAssetService.js'
import { systemHealthService } from '../services/system/systemHealthService.js'
import { systemSettingsService } from '../services/system/systemSettingsService.js'
import { respondWithService } from '../utils/controllerResponder.js'

export const systemController = {
  getHealth: (req: Request, res: Response) => {
    return respondWithService(res, () => systemHealthService.getHealth())
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
