/**
 * API 错误类
 * 统一的错误处理格式
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express'

export class ApiError extends Error {
  statusCode: number
  code: string
  details: unknown
  timestamp: string

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details: unknown = null
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
  }

  /**
   * 转换为 JSON 响应格式
   */
  toJSON() {
    return {
      success: false as const,
      error: {
        code: this.code,
        message: this.message,
        timestamp: this.timestamp,
        ...(this.details != null ? { details: this.details } : {})
      }
    }
  }
}

/**
 * 预定义的常用错误
 */
export const Errors = {
  // 认证相关
  UNAUTHORIZED: (message = '未授权，请先登录') => new ApiError(message, 401, 'UNAUTHORIZED'),

  FORBIDDEN: (message = '无权限访问') => new ApiError(message, 403, 'FORBIDDEN'),

  INVALID_TOKEN: (message = 'Token 无效或已过期') => new ApiError(message, 401, 'INVALID_TOKEN'),

  // 资源相关
  NOT_FOUND: (resource = '资源') => new ApiError(`${resource}不存在`, 404, 'NOT_FOUND'),

  DUPLICATE: (field = '数据') => new ApiError(`${field}已存在`, 409, 'DUPLICATE'),

  // 验证相关
  VALIDATION: (message = '数据验证失败', details: unknown = null) =>
    new ApiError(message, 400, 'VALIDATION_ERROR', details),

  MISSING_FIELD: (field: string) => new ApiError(`缺少必填字段: ${field}`, 400, 'MISSING_FIELD'),

  INVALID_FORMAT: (field: string) => new ApiError(`${field}格式不正确`, 400, 'INVALID_FORMAT'),

  // 业务逻辑相关
  OPERATION_FAILED: (message = '操作失败') => new ApiError(message, 500, 'OPERATION_FAILED'),

  RATE_LIMIT: (message = '请求过于频繁，请稍后再试') =>
    new ApiError(message, 429, 'RATE_LIMIT_EXCEEDED'),

  // 数据库相关
  DATABASE_ERROR: (message = '数据库操作失败') => new ApiError(message, 500, 'DATABASE_ERROR'),

  // 文件相关
  FILE_TOO_LARGE: (maxSize = '10MB') =>
    new ApiError(`文件过大，最大支持 ${maxSize}`, 413, 'FILE_TOO_LARGE'),

  UNSUPPORTED_FILE_TYPE: (allowedTypes = '图片') =>
    new ApiError(`不支持的文件类型，仅支持 ${allowedTypes}`, 415, 'UNSUPPORTED_FILE_TYPE')
}

/**
 * 异步错误处理包装器
 * 用于包装异步路由处理函数，自动捕获错误
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => unknown
): RequestHandler => {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export default { ApiError, Errors, asyncHandler }
