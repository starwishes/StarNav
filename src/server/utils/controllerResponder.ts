import type { Response } from 'express'

import { logger } from './logger.js'
import {
  errorPayload,
  isApiEnvelope,
  isStructuredResponse,
  successPayload,
  type StructuredResponse
} from './response.js'

interface ServiceErrorLike {
  message?: string
  statusCode?: number
  code?: string
  stack?: string
}

const logServiceFailure = (statusCode: number, error: ServiceErrorLike) => {
  const context = {
    error: error.message,
    statusCode,
    code: error.code || 'INTERNAL_ERROR'
  }

  if (statusCode >= 500) {
    logger.error('Controller service execution failed', context)
    return
  }

  logger.debug('Controller request rejected', context)
}

export const respondWithService = (
  res: Response,
  action: () => unknown | Promise<unknown>
): Promise<void> => {
  return Promise.resolve()
    .then(() => action())
    .then((result) => {
      const normalized: StructuredResponse | unknown = isStructuredResponse(result)
        ? result
        : isApiEnvelope(result)
          ? { statusCode: 200, body: result }
          : successPayload(result)

      if (isStructuredResponse(normalized)) {
        const response = res.status(normalized.statusCode)

        if (normalized.headers && typeof normalized.headers === 'object') {
          Object.entries(normalized.headers).forEach(([name, value]) => {
            response.set(name, value)
          })
        }

        if (normalized.responseType === 'text' || normalized.responseType === 'send') {
          response.send(normalized.body)
          return
        }

        response.json(normalized.body)
        return
      }

      res.json(normalized)
    })
    .catch((error: ServiceErrorLike) => {
      const statusCode = error.statusCode || 500
      const payload = errorPayload(
        error.message || '服务器内部错误',
        statusCode,
        error.code || 'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? error.stack : undefined
      )

      logServiceFailure(statusCode, error)

      res.status(statusCode).json(payload.body)
    })
}
