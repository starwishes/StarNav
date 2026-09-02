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

// 客户端可控 User-Agent 原样入库会撑大 sessions/audit_logs 行（详见第 16 轮审查）：
// 在来源解析处统一截断，后续 sessionService/auditService 落库均获得有界值。
const MAX_USER_AGENT_LENGTH = 256

export const getUserAgent = (req: RequestLike | null | undefined): string => {
  const ua = req?.headers?.['user-agent']
  const raw = Array.isArray(ua) ? ua[0] || 'unknown' : ua || 'unknown'
  return raw.slice(0, MAX_USER_AGENT_LENGTH)
}

export const buildRequestContext = (req: RequestLike | null | undefined): RequestContext => {
  return {
    ip: getClientIP(req),
    userAgent: getUserAgent(req)
  }
}
