import type { Request } from 'express'

export const AUTH_COOKIE_NAME = 'starnav_auth'

const AUTH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export interface AuthCookieOptions {
  maxAge?: number
  expires?: Date
  secure?: boolean
}

const serializeCookie = (
  name: string,
  value: string,
  { maxAge, expires, secure = false }: AuthCookieOptions = {}
): string => {
  const segments = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']

  if (typeof maxAge === 'number') {
    segments.push(`Max-Age=${Math.max(0, Math.floor(maxAge / 1000))}`)
  }

  if (expires instanceof Date) {
    segments.push(`Expires=${expires.toUTCString()}`)
  }

  if (secure) {
    segments.push('Secure')
  }

  return segments.join('; ')
}

const readForwardedProto = (req: Request | null | undefined): string => {
  if (!req) {
    return ''
  }

  if (typeof req.get === 'function') {
    return req.get('x-forwarded-proto') || ''
  }

  const headers = req.headers as Record<string, string | string[] | undefined> | undefined
  const value = headers?.['x-forwarded-proto']
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return value || ''
}

export const shouldUseSecureAuthCookie = (req?: Request | null): boolean => {
  const override = process.env.AUTH_COOKIE_SECURE
  if (override === 'true') {
    return true
  }
  if (override === 'false') {
    return false
  }

  if (!req) {
    return process.env.NODE_ENV === 'production'
  }

  if (req.secure === true || req.protocol === 'https') {
    return true
  }

  if (process.env.TRUST_PROXY !== 'true') {
    return false
  }

  return String(readForwardedProto(req))
    .split(',')
    .some((value) => value.trim().toLowerCase() === 'https')
}

export const createAuthCookieHeader = (token: string, options: AuthCookieOptions = {}): string =>
  serializeCookie(AUTH_COOKIE_NAME, token, {
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    expires: new Date(Date.now() + AUTH_COOKIE_MAX_AGE_MS),
    ...options
  })

export const clearAuthCookieHeader = (options: AuthCookieOptions = {}): string =>
  serializeCookie(AUTH_COOKIE_NAME, '', {
    maxAge: 0,
    expires: new Date(0),
    ...options
  })

export const readAuthCookie = (cookieHeader = ''): string | null => {
  if (!cookieHeader) {
    return null
  }

  const pairs = cookieHeader.split(';')
  for (const pair of pairs) {
    const [rawName, ...rawValueParts] = pair.trim().split('=')
    if (rawName !== AUTH_COOKIE_NAME) {
      continue
    }

    const rawValue = rawValueParts.join('=')
    return rawValue ? decodeURIComponent(rawValue) : null
  }

  return null
}
