import type { Request } from 'express'

/**
 * 认证 Cookie。
 *
 * 有意不使用 `__Host-` 前缀：该前缀要求 Cookie 必须带 Secure 且 Host-only + Path=/，
 * 而 StarNav 明确支持纯 HTTP 部署（OPERATIONS.md），此时 Secure 会被关闭，
 * 浏览器会直接拒绝 `__Host-` Cookie。当前已具备 host-only（无 Domain）、Path=/、
 * HttpOnly、SameSite=Lax，且 Secure 按部署自动开启；若未来仅支持 HTTPS，
 * 可再切换为 `__Host-` 前缀（注意切换会导致所有已登录会话失效）。
 */
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

  // 有意不复用 config 的 TRUST_PROXY 常量：该常量在模块加载时冻结，
  // 而本函数按请求时点读取 env（测试也依赖调用时改 env 的行为）；且
  // import config 会连带触发 JWT_SECRET 生成副作用，作为纯工具模块不值当。
  // 单一事实来源权衡：默认语义（未设置视为信任一层反代）与 config 保持一致。
  if (process.env.TRUST_PROXY === 'false') {
    return false
  }

  // trust proxy 开启时 Express 已把 X-Forwarded-Proto 并入 req.protocol，
  // 此回退仅在非 Express 调用方（如测试 mock）且 req.protocol 未反映转发
  // 协议时兜底，正常请求路径不可达。
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
    if (!rawValue) {
      return null
    }

    try {
      return decodeURIComponent(rawValue)
    } catch {
      // 畸形/恶意编码（如 %zz）按"无 token"处理，避免抛出 URIError 让请求 500
      return null
    }
  }

  return null
}
