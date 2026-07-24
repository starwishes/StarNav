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

export const buildSuccessBody = <T = unknown>(
  data?: T,
  message = 'Success'
): SuccessBody<T> => {
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
  Boolean(value) && typeof value === 'object' && typeof (value as { success?: unknown }).success === 'boolean'

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
