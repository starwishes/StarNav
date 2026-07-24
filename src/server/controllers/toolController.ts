import type { Request, Response } from 'express'
import { toolFaviconService } from '../services/tools/toolFaviconService.js'
import { toolLinkCheckService } from '../services/tools/toolLinkCheckService.js'
import { toolSuggestionService } from '../services/tools/toolSuggestionService.js'
import { respondWithService } from '../utils/controllerResponder.js'

export const toolController = {
  getFavicon: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      toolFaviconService.getFavicon(String(req.query.url || ''))
    )
  },

  checkLinks: (req: Request, res: Response) => {
    return respondWithService(res, () => toolLinkCheckService.checkLinks(req.body.urls))
  },

  getSuggestions: (req: Request, res: Response) => {
    return respondWithService(res, () =>
      toolSuggestionService.getSuggestions(String(req.query.keyword || ''), req.query.type ? String(req.query.type) : undefined)
    )
  }
}
