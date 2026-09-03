import dns from 'node:dns/promises'
import net from 'node:net'

import { errors } from '../utils/errors.js'
import { parseIpv6ToBigInt } from './cloudflareIp.js'

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

const ipv4UintToOctets = (v4: number): number[] => [
  (v4 >>> 24) & 0xff,
  (v4 >>> 16) & 0xff,
  (v4 >>> 8) & 0xff,
  v4 & 0xff
]

/**
 * 从 128-bit 值中解出内嵌 IPv4 的 uint32；非命中返回 null。
 *
 * 位级判定统一处理四类把 IPv4 塞进 IPv6 地址的过渡/翻译形态（对 dotted 与 hex 记法
 * 等价，避免字符串前缀匹配漏判），这些形态若内嵌私网地址即构成与 IPv4-mapped 同族的
 * SSRF 绕过（resolvePublicHttpTarget 需在解析后、发起请求前拦截）：
 *
 * - IPv4-mapped ::ffff:0:0/96：高 80 位全 0 且第 3~4 组 0xffff（>>32 == 0xffff 且 >>48 == 0），
 *   IPv4 在低 32 位
 * - IPv4-compatible ::/96：高 96 位全 0（>>32 == 0，:: 全零本身无内嵌 v4，已单列拦截）
 * - NAT64 well-known 64:ff9b::/96（RFC 6052 §3.1，固定 n=96）：IPv4 恒在低 32 位
 * - 6to4 2002::/16：第 2~3 组（bits 80~111）为内嵌 IPv4，其余位不参与判定
 *
 * ⚠️ NAT64 local-use 64:ff9b:1::/48（RFC 8215）不在本函数解内嵌 v4：RFC 6052 对不同
 * NSP 前缀长度 n（32/40/48/56/64/96）把 IPv4 放在不同位窗，仅 n=96 落在低 32 位；
 * /48 内可部署任意 n 的转换器，无法用"低 32 位即 v4"精确解出内嵌地址（低 32 位是
 * 转换器忽略的 suffix）。该块是本地管理的前缀，自部署的出站探测不应以它为公网目标，
 * 故在 isPrivateIpv6Address 中对整块 /48 直接封锁。
 */
const extractEmbeddedIpv4Uint = (value: bigint): number | null => {
  if (value >> 32n === 0xffffn && value >> 48n === 0n) {
    return Number(value & 0xffffffffn)
  }

  if (value >> 32n === 0n && value !== 0n) {
    return Number(value & 0xffffffffn)
  }

  if (value >> 32n === 0x64ff9bn << 64n) {
    return Number(value & 0xffffffffn)
  }

  if (value >> 112n === 0x2002n) {
    return Number((value >> 80n) & 0xffffffffn)
  }

  return null
}

const isPrivateIpv6Address = (address: string): boolean => {
  const normalized = String(address || '')
    .trim()
    .toLowerCase()

  // 先按内嵌 IPv4 形态判定：127.0.0.1 / 169.254.169.254（云元数据）等私网内嵌地址在纯
  // IPv6 前缀表下会漏判，导致 resolvePublicHttpTarget 放行
  const value = parseIpv6ToBigInt(normalized)
  if (value !== null) {
    // NAT64 local-use 64:ff9b:1::/48（RFC 8215）整块封锁：该前缀内实际部署的 NSP 前缀
    // 长度 n 不定（RFC 6052 下 n<96 时 v4 位窗高于低 32 位，低 32 位是转换器忽略的
    // suffix），无法用"低 32 位即 v4"精确解出内嵌地址——低 32 位可被构造成公网 IP 而
    // 真实内嵌私网地址（如 127.0.0.1）位于更高位窗，见 extractEmbeddedIpv4Uint 注释。
    // 该本地管理前缀不是自部署出站探测应访问的公网目标，故对整块 /48 直接拒绝。
    if (value >> 80n === 0x64ff9b0001n) {
      return true
    }
    const embeddedV4 = extractEmbeddedIpv4Uint(value)
    if (embeddedV4 !== null) {
      return isPrivateIpv4Address(ipv4UintToOctets(embeddedV4).join('.'))
    }
  }

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

  // hostname 上带 [] 的 IPv6 字面量（如 [::1]）经 net.isIP 恒返回 0，走不到这里的内嵌判定；
  // 私网 IPv6/内嵌 IPv4 形态统一在 assertPublicDnsTarget 对解析结果的逐条检查中拦截
  //（dns.lookup 对纯 IP 字面量不产生网络流量，仅做格式解析）。此分支实际拦截的是 IPv4
  // 私网字面量（8.8.8.8 等公网 IPv4 除外）与 localhost/.local/.internal 主机名。
  if (isBlockedHostname(parsed.hostname) || isPrivateIpAddress(parsed.hostname)) {
    throw errors.badRequest(LINK_CHECK_TARGET_ERROR)
  }

  const url = parsed.toString()

  // 字面量直连快路径：仅 IPv4 会命中——IPv6 hostname 带 []（net.isIP 恒 0），一律走下方
  // assertPublicDnsTarget 的 DNS 兜底解析（对 IP 字面量零网络开销，且结果会再过一遍
  // isPrivateIpAddress，覆盖纯 IPv6 私网与 mapped/兼容/NAT64/6to4 内嵌私网形态）。
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
