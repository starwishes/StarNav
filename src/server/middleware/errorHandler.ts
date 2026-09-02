/**
 * Global Error Handler Middleware for Express
 * Provides consistent error responses across all API endpoints
 */

import type { ErrorRequestHandler } from 'express'

import { logger } from '../utils/logger.js'
import { formatError } from '../utils/response.js'

/**
 * Global error handling middleware
 * Should be added as the last middleware in Express app
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // 响应头已发出（如流式/已提交），无法再写错误响应，交给 Express 兜底
  if (res.headersSent) {
    return next(err)
  }

  // Log error details
  logger.error('API Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  })

  // Determine if we're in development
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Send formatted error response
  const statusCode = err.statusCode || 500
  res.status(statusCode).json(formatError(err, isDevelopment, statusCode))
}
