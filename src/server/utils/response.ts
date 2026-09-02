/**
 * 统一响应封装
 */
import type { Response } from 'express'

export type ResponseHeaders = Record<string, string>

export interface SuccessBody<T = unknown> {
  success: true
  message: string
  data?: T
}

export interface ErrorBody {
  success: false
  error: string
  code: string
  details?: unknown
}

export type ResponseType = 'json' | 'text' | 'send'

export interface StructuredResponse<TBody = unknown> {
  statusCode: number
  body: TBody
  headers?: ResponseHeaders
  responseType?: ResponseType
}

export const buildSuccessBody = <T = unknown>(data?: T, message = 'Success'): SuccessBody<T> => {
  const response: SuccessBody<T> = {
    success: true,
    message
  }

  if (data !== undefined) {
    response.data = data
  }

  return response
}

export const buildErrorBody = (
  message = 'Internal Server Error',
  code = 'INTERNAL_ERROR',
  details?: unknown
): ErrorBody => {
  const response: ErrorBody = {
    success: false,
    error: message,
    code
  }

  if (details !== undefined) {
    response.details = details
  }

  return response
}

export const successPayload = <T = unknown>(
  data?: T,
  message = 'Success',
  statusCode = 200,
  headers: ResponseHeaders = {}
): StructuredResponse<SuccessBody<T>> => ({
  statusCode,
  ...(Object.keys(headers).length > 0 ? { headers } : {}),
  body: buildSuccessBody(data, message)
})

export const errorPayload = (
  message = 'Internal Server Error',
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  details?: unknown,
  headers: ResponseHeaders = {}
): StructuredResponse<ErrorBody> => ({
  statusCode,
  ...(Object.keys(headers).length > 0 ? { headers } : {}),
  body: buildErrorBody(message, code, details)
})

export const sendPayload = <TBody = unknown>(
  body: TBody,
  headers: ResponseHeaders = {},
  statusCode = 200,
  responseType: ResponseType = 'send'
): StructuredResponse<TBody> => ({
  statusCode,
  ...(Object.keys(headers).length > 0 ? { headers } : {}),
  body,
  responseType
})

export const textPayload = (
  body: string,
  statusCode = 200,
  headers: ResponseHeaders = {}
): StructuredResponse<string> =>
  sendPayload(body, { 'Content-Type': 'text/plain; charset=utf-8', ...headers }, statusCode, 'text')

export const isStructuredResponse = (value: unknown): value is StructuredResponse =>
  Boolean(value) &&
  typeof value === 'object' &&
  Number.isInteger((value as StructuredResponse).statusCode) &&
  'body' in (value as object)

export const isApiEnvelope = (value: unknown): value is { success: boolean } =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof (value as { success?: unknown }).success === 'boolean'

export const successResponse = <T = unknown>(
  res: Response,
  data?: T,
  message = 'Success'
): Response => {
  return res.status(200).json(buildSuccessBody(data, message))
}

export const errorResponse = (
  res: Response,
  message = 'Internal Server Error',
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  details?: unknown
): Response => {
  return res.status(statusCode).json(buildErrorBody(message, code, details))
}

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
 *
 * 刻意使用中文硬编码、不引入 i18n：这是后端固定脱敏文案，不属于前端
 * locale 范畴；CLI/扩展/脚本客户端同样消费该文案，保持单一稳定取值
 * 比多语言化更重要（第 2 轮固定脱敏文案决策的延续）。
 */
const GENERIC_SERVER_ERROR = '服务器内部错误'
const GENERIC_CLIENT_ERROR = '请求错误'

/**
 * Standard error response format
 * - 4xx：业务校验类信息本来就面向调用方，保留原始 message/code
 * - 5xx 且非开发环境：message 与 code 均替换为通用值，不透传内部信息；
 *   开发环境全量返回便于排查
 *
 * 供 errorHandler 中间件与 controllerResponder 复用，避免分层反向依赖。
 */
export const formatError = (error: ErrorLike, isDevelopment = false, statusCode = 500) => {
  const isServerError = statusCode >= 500
  const exposeDetails = isDevelopment || !isServerError
  return buildErrorBody(
    exposeDetails ? error.message || GENERIC_CLIENT_ERROR : GENERIC_SERVER_ERROR,
    exposeDetails ? error.code || 'INTERNAL_ERROR' : 'INTERNAL_ERROR',
    isDevelopment ? error.stack : undefined
  )
}
