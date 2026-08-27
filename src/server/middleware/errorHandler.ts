/**
 * Global Error Handler Middleware for Express
 * Provides consistent error responses across all API endpoints
 */

import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express'

import { logger } from '../utils/logger.js'
import { buildErrorBody } from '../utils/response.js'

interface ErrorLike {
  message?: string
  code?: string
  stack?: string
  statusCode?: number
}

/**
 * 5xx 错误对外暴露的通用文案。
 * 内部异常的原始 message 可能包含 SQL、文件路径等敏感信息，
 * 生产环境一律替换，避免通过 500 响应泄露实现细节。
 */
const GENERIC_SERVER_ERROR = '服务器内部错误'

/**
 * Standard error response format
 * - 4xx：业务校验类信息本来就面向调用方，保留原始 message/code
 * - 5xx 且非开发环境：message 与 code 均替换为通用值，不透传内部信息；
 *   开发环境全量返回便于排查
 */
export const formatError = (error: ErrorLike, isDevelopment = false, statusCode = 500) => {
  const isServerError = statusCode >= 500
  const exposeDetails = isDevelopment || !isServerError
  return buildErrorBody(
    exposeDetails ? error.message || 'An error occurred' : GENERIC_SERVER_ERROR,
    exposeDetails ? error.code || 'INTERNAL_ERROR' : 'INTERNAL_ERROR',
    isDevelopment ? error.stack : undefined
  )
}

/**
 * Global error handling middleware
 * Should be added as the last middleware in Express app
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
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

/**
 * Create custom errors with specific codes
 */
export class ApiError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code = 'API_ERROR', statusCode = 500) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.name = 'ApiError'
  }
}

/**
 * Common error creators
 */
export const errors = {
  notFound: (message = '资源未找到') => new ApiError(message, 'NOT_FOUND', 404),
  unauthorized: (message = '未授权访问') => new ApiError(message, 'UNAUTHORIZED', 401),
  forbidden: (message = '权限不足') => new ApiError(message, 'FORBIDDEN', 403),
  badRequest: (message = '请求参数错误') => new ApiError(message, 'BAD_REQUEST', 400),
  conflict: (message = '资源冲突') => new ApiError(message, 'CONFLICT', 409),
  internal: (message = '服务器内部错误') => new ApiError(message, 'INTERNAL_ERROR', 500)
}
/**
 * Wrap async functions to catch errors and pass them to next()
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => unknown
): RequestHandler => {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next)
  }
}
