import {
  ApiError as SharedApiError,
  extractApiErrorMessage,
  getApiField as sharedGetApiField,
  mergeApiPayload as sharedMergeApiPayload,
  readJsonBody,
  unwrapApiPayload as sharedUnwrapApiPayload
} from '../../shared/api.js'
import type { GenericApiResponse } from '../../shared/api.js'
import { createScopedLogger } from '../../shared/logger.js'

/** HTTP JSON envelope — shared contract (`common/api` + `common/types`) */
export type ApiResponse<T = unknown> = GenericApiResponse<T>

export interface BlobResponse {
  blob: Blob
  filename?: string
  contentType?: string
}

export class ApiClientError<TPayload = unknown> extends SharedApiError<TPayload> {
  constructor(message: string, status: number, payload?: TPayload) {
    super(message, { status, payload })
    this.name = 'ApiClientError'
  }
}

export const unwrapApiPayload = <T>(payload: ApiResponse<T> | T): T =>
  sharedUnwrapApiPayload(payload as ApiResponse<T> | T)

export const mergeApiPayload = <T extends object>(
  payload: ApiResponse<T> | T
): ApiResponse<T> & T => sharedMergeApiPayload(payload as ApiResponse<T> | T) as ApiResponse<T> & T

export const getApiField = <T>(
  payload: ApiResponse<Record<string, unknown>> | Record<string, unknown>,
  field: string,
  fallback: T
): T => sharedGetApiField(payload, field, fallback)

const BASE_URL = '/api'
const AUTH_CLEARED_EVENT = 'starnav:auth-cleared'
const logger = createScopedLogger('web:api')

const clearAuthStorage = () => {
  localStorage.removeItem('admin_user')
  window.dispatchEvent(new Event(AUTH_CLEARED_EVENT))
}

const buildHeaders = (headers?: HeadersInit) => {
  const resolved = new Headers(headers)

  if (!resolved.has('Content-Type')) {
    resolved.set('Content-Type', 'application/json')
  }

  return resolved
}

const parseErrorPayload = async (response: Response) => {
  const data = (await readJsonBody<ApiResponse>(response, {})) as ApiResponse

  return {
    message: extractApiErrorMessage(data, response.status),
    payload: data
  }
}

const parseFilename = (contentDisposition: string | null) => {
  if (!contentDisposition) {
    return undefined
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const asciiMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  return asciiMatch?.[1]
}

async function client<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config: RequestInit = {
    ...options,
    credentials: 'same-origin',
    headers: buildHeaders(options.headers)
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config)

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthStorage()
      }

      const { message, payload } = await parseErrorPayload(response)
      throw new ApiClientError(message, response.status, payload)
    }

    return (await response.json()) as T
  } catch (error) {
    logger.error(`API request failed: ${endpoint}`, error)
    throw error
  }
}

async function clientBlob(endpoint: string, options: RequestInit = {}): Promise<BlobResponse> {
  const config: RequestInit = {
    ...options,
    credentials: 'same-origin',
    headers: buildHeaders(options.headers)
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config)

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthStorage()
      }

      const { message, payload } = await parseErrorPayload(response)
      throw new ApiClientError(message, response.status, payload)
    }

    return {
      blob: await response.blob(),
      filename: parseFilename(response.headers.get('content-disposition')),
      contentType: response.headers.get('content-type') || undefined
    }
  } catch (error) {
    logger.error(`API blob request failed: ${endpoint}`, error)
    throw error
  }
}

export const api = {
  get: <T>(url: string, options: RequestInit = {}) => client<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body: unknown) =>
    client<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    client<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    client<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(url: string) => client<T>(url, { method: 'DELETE' }),
  blob: (url: string, options: RequestInit = {}) => clientBlob(url, options)
}
