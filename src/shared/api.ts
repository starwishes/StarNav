export interface GenericApiResponse<T = unknown> {
  success?: boolean
  error?: string
  message?: string
  code?: string
  content?: T
  data?: T
  [key: string]: unknown
}

export class ApiError<TPayload = unknown> extends Error {
  status?: number
  payload?: TPayload

  constructor(message: string, options: { status?: number; payload?: TPayload } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.payload = options.payload
  }
}

export function unwrapApiPayload<T>(payload: GenericApiResponse<T> | T): T {
  // 服务端只下发 `data` 信封；`content` 仅是 POST /data 的历史输入字段名，
  // 不参与响应解包（见 validation.ts dataSchema）。
  if (payload && typeof payload === 'object') {
    const record = payload as GenericApiResponse<T>
    if (record.data !== undefined) {
      return record.data as T
    }
  }

  return payload as T
}

export function mergeApiPayload<T extends object>(
  payload: GenericApiResponse<T> | T
): GenericApiResponse<T> & T {
  const base = payload && typeof payload === 'object' ? payload : ({} as GenericApiResponse<T>)
  const unwrapped = unwrapApiPayload(payload)

  if (unwrapped && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
    return {
      ...(base as object),
      ...(unwrapped as object)
    } as GenericApiResponse<T> & T
  }

  return base as GenericApiResponse<T> & T
}

export function getApiField<T>(
  payload: GenericApiResponse<Record<string, unknown>> | Record<string, unknown>,
  field: string,
  fallback: T
): T {
  if (payload && typeof payload === 'object' && field in payload) {
    return (payload as Record<string, unknown>)[field] as T
  }

  const unwrapped = unwrapApiPayload(payload)
  if (unwrapped && typeof unwrapped === 'object' && field in (unwrapped as object)) {
    return (unwrapped as Record<string, unknown>)[field] as T
  }

  return fallback
}

export function extractApiErrorMessage(
  payload: GenericApiResponse<unknown> | Record<string, unknown> | undefined,
  status?: number
): string {
  if (payload && typeof payload === 'object') {
    if (typeof payload.error === 'string' && payload.error) {
      return payload.error
    }

    if (typeof payload.message === 'string' && payload.message) {
      return payload.message
    }
  }

  return typeof status === 'number' ? `HTTP Error ${status}` : 'Request failed'
}

export async function readJsonBody<T = Record<string, unknown>>(
  response: Response,
  fallback: T = {} as T
): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    return fallback
  }
}
