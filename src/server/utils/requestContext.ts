import type { Request } from 'express'

export interface RequestContext {
  ip: string
  userAgent: string
}

type RequestLike = Pick<Request, 'ip' | 'socket' | 'headers'> & {
  connection?: { remoteAddress?: string }
}

export const getClientIP = (req: RequestLike | null | undefined): string => {
  if (typeof req?.ip === 'string' && req.ip.trim()) {
    return req.ip.trim()
  }

  return req?.socket?.remoteAddress || req?.connection?.remoteAddress || 'unknown'
}

export const getUserAgent = (req: RequestLike | null | undefined): string => {
  const ua = req?.headers?.['user-agent']
  if (Array.isArray(ua)) {
    return ua[0] || 'unknown'
  }
  return ua || 'unknown'
}

export const buildRequestContext = (req: RequestLike | null | undefined): RequestContext => {
  return {
    ip: getClientIP(req),
    userAgent: getUserAgent(req)
  }
}
