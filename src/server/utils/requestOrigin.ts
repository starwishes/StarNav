import type { Request } from 'express'

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3333',
  'http://localhost:3334',
  'http://127.0.0.1:3333',
  'http://127.0.0.1:3334',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
]

const HTTP_PROTOCOLS = new Set(['http:', 'https:'])
const EXTENSION_ORIGIN_PATTERN = /^(chrome-extension:\/\/[^/]+|moz-extension:\/\/[^/]+)/i

type RequestLike = {
  get?: (name: string) => string | undefined
  headers?: Record<string, string | string[] | undefined>
  protocol?: string
}

export interface CorsOriginPolicy {
  allowed: boolean
  allowCredentials: boolean
}

export interface TrustedWriteOriginResult {
  trusted: boolean
  source: 'origin' | 'referer' | null
  origin: string | null
}

const readHeader = (req: RequestLike | null | undefined, name: string): string | undefined => {
  if (!req) {
    return undefined
  }

  if (typeof req.get === 'function') {
    const viaGet = req.get(name)
    if (viaGet != null) {
      return viaGet
    }
  }

  const headers = req.headers
  if (!headers) {
    return undefined
  }

  const value = headers[name.toLowerCase()] ?? headers[name]
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

const normalizeOriginValue = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const extensionMatch = trimmed.match(EXTENSION_ORIGIN_PATTERN)
  if (extensionMatch?.[1]) {
    return extensionMatch[1]
  }

  try {
    const parsed = new URL(trimmed)
    if (!HTTP_PROTOCOLS.has(parsed.protocol)) {
      return null
    }

    return parsed.origin
  } catch {
    return null
  }
}

/** 判断来源是否为浏览器扩展（chrome-extension:// 或 moz-extension://）。 */
export const isExtensionOrigin = (origin: string | null | undefined): boolean =>
  typeof origin === 'string' && EXTENSION_ORIGIN_PATTERN.test(origin)

const getConfiguredOrigins = (): string[] => {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  }

  return process.env.NODE_ENV === 'production' ? [] : DEFAULT_ALLOWED_ORIGINS
}

const includesConfiguredOrigin = (
  origin: string,
  { allowWildcard = true }: { allowWildcard?: boolean } = {}
): boolean => {
  const allowedOrigins = getConfiguredOrigins()

  if (allowedOrigins.includes(origin)) {
    return true
  }

  return allowWildcard && allowedOrigins.includes('*')
}

export const resolveCorsOriginPolicy = (
  origin: string | undefined,
  req?: Request | RequestLike | null
): CorsOriginPolicy => {
  if (!origin) {
    return {
      allowed: true,
      allowCredentials: true
    }
  }

  const normalizedOrigin = normalizeOriginValue(origin)
  if (!normalizedOrigin) {
    return {
      allowed: false,
      allowCredentials: false
    }
  }

  if (isExtensionOrigin(normalizedOrigin)) {
    return {
      allowed: true,
      allowCredentials: false
    }
  }

  const requestOrigin = getRequestOrigin(req)
  const allowed = Boolean(
    (requestOrigin && normalizedOrigin === requestOrigin) ||
    includesConfiguredOrigin(normalizedOrigin)
  )

  return {
    allowed,
    allowCredentials: allowed
  }
}

export const getRequestOrigin = (req?: Request | RequestLike | null): string | null => {
  const host = readHeader(req, 'host')
  if (!host || !req?.protocol) {
    return null
  }

  return normalizeOriginValue(`${req.protocol}://${host}`)
}

export const isAllowedCorsOrigin = (
  origin: string | undefined,
  req?: Request | RequestLike | null
): boolean => {
  return resolveCorsOriginPolicy(origin, req).allowed
}

export const validateTrustedWriteOrigin = (
  req: Request | RequestLike | null | undefined,
  options: { allowExtensionOrigins?: boolean } = {}
): TrustedWriteOriginResult => {
  const { allowExtensionOrigins = false } = options
  const trustedExtensionOrigin = (origin: string | null): boolean =>
    allowExtensionOrigins && isExtensionOrigin(origin)

  const originHeader = normalizeOriginValue(readHeader(req, 'origin'))
  if (originHeader) {
    return {
      trusted:
        originHeader === getRequestOrigin(req) ||
        includesConfiguredOrigin(originHeader, { allowWildcard: false }) ||
        trustedExtensionOrigin(originHeader),
      source: 'origin',
      origin: originHeader
    }
  }

  const refererOrigin = normalizeOriginValue(readHeader(req, 'referer'))
  if (refererOrigin) {
    return {
      trusted:
        refererOrigin === getRequestOrigin(req) ||
        includesConfiguredOrigin(refererOrigin, { allowWildcard: false }) ||
        trustedExtensionOrigin(refererOrigin),
      source: 'referer',
      origin: refererOrigin
    }
  }

  return {
    trusted: false,
    source: null,
    origin: null
  }
}
