/**
 * 领域错误：ApiError 类 + errors 工厂。
 * 供 services/controllers 层抛业务错误使用，与 Express HTTP 中间件解耦。
 */

/**
 * 携带 HTTP 状态码与业务错误码的领域错误。
 * 由 errorHandler 中间件统一转成响应体（见 middleware/errorHandler.ts）。
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
