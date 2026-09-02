import dns from 'node:dns/promises'
import net from 'node:net'

import { errors } from '../utils/errors.js'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const LINK_CHECK_TARGET_ERROR = '仅支持检测公网 HTTP/HTTPS 地址'

const MAX_IPV4_OCTET = 255

const parseIpv4Octets = (address: unknown): number[] | null => {
  const parts = String(address || '').split('.')
  if (parts.length !== 4) {
    return null
  }

  const octets = parts.map((part) => Number.parseInt(part, 10))
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > MAX_IPV4_OCTET)) {
    return null
  }

  return octets
}

const isPrivateIpv4Address = (address: string): boolean => {
  const octets = parseIpv4Octets(address)
  if (!octets) {
    return false
  }

  const [first, second] = octets

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127) ||
    first >= 224
  )
}

const isPrivateIpv6Address = (address: string): boolean => {
  const normalized = String(address || '')
    .trim()
    .toLowerCase()

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('ff') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  )
}

const isPrivateIpAddress = (address: string): boolean => {
  const version = net.isIP(address)
  if (version === 4) {
    return isPrivateIpv4Address(address)
  }

  if (version === 6) {
    return isPrivateIpv6Address(address)
  }

  return false
}

const isBlockedHostname = (hostname: string): boolean => {
  const normalized = String(hostname || '')
    .trim()
    .toLowerCase()
  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal')
  )
}

const assertPublicDnsTarget = async (
  hostname: string
): Promise<Array<{ address: string; family: number }>> => {
  let results: Array<{ address: string; family: number }>

  try {
    results = await dns.lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw errors.badRequest(LINK_CHECK_TARGET_ERROR)
  }

  if (!Array.isArray(results) || results.length === 0) {
    throw errors.badRequest(LINK_CHECK_TARGET_ERROR)
  }

  if (results.some((result) => isPrivateIpAddress(result.address))) {
    throw errors.badRequest(LINK_CHECK_TARGET_ERROR)
  }

  return results
}

export type ResolvedPublicHttpTarget = {
  url: string
  address: string
  family: number
}

/**
 * 校验目标 URL 为公网 HTTP/HTTPS 地址，并解析出固定 IP。
 *
 * 返回固定的 IP 地址供调用方在发起请求时通过自定义 `lookup` 直连，
 * 避免「校验后 fetch 再独立解析」的 DNS rebinding 绕过（攻击者可在
 * 校验与请求之间把域名解析到 127.0.0.1 / 169.254.169.254 等私网地址）。
 */
export const resolvePublicHttpTarget = async (
  value: unknown
): Promise<ResolvedPublicHttpTarget> => {
  if (typeof value !== 'string') {
    throw errors.badRequest(LINK_CHECK_TARGET_ERROR)
  }

  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    throw errors.badRequest(LINK_CHECK_TARGET_ERROR)
  }

  if (
    !ALLOWED_PROTOCOLS.has(parsed.protocol) ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password
  ) {
    throw errors.badRequest(LINK_CHECK_TARGET_ERROR)
  }

  if (isBlockedHostname(parsed.hostname) || isPrivateIpAddress(parsed.hostname)) {
    throw errors.badRequest(LINK_CHECK_TARGET_ERROR)
  }

  const url = parsed.toString()

  if (net.isIP(parsed.hostname) !== 0) {
    const family = net.isIP(parsed.hostname)
    return { url, address: parsed.hostname, family }
  }

  const results = await assertPublicDnsTarget(parsed.hostname)
  const first = results[0]
  return {
    url,
    address: first.address,
    family: first.family ?? (net.isIP(first.address) === 6 ? 6 : 4)
  }
}
