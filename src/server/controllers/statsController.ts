import type { Request, Response } from 'express'
import { statsService } from '../services/system/statsService.js'
import { buildRequestContext } from '../utils/requestContext.js'
import { respondWithService } from '../utils/controllerResponder.js'

export const statsController = {
  getStats: (req: Request, res: Response) => {
    return respondWithService(res, () => statsService.getStats())
  },

  recordVisit: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      statsService.recordVisit({
        ...buildRequestContext(req),
        referrer: req.body?.url || req.headers.referer
      })
    )
  },

  /**
   * 获取缓存运行统计信息 (监控专用)
   */
  getCacheStats: (req: Request, res: Response) => {
    return respondWithService(res, () => statsService.getCacheStats())
  }
}
