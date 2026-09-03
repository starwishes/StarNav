import net from 'node:net'

/**
 * Cloudflare 边缘网段识别（用于"流量确实经过 Cloudflare"的部署判定）。
 *
 * Cloudflare 只会为真正经过其网络的流量设置并覆盖 `CF-Connecting-IP`（丢弃客户端
 * 伪造值）。因此当 socket 对端（远端地址）落在 Cloudflare 官方网段内时，可以安全
 * 采信该头作为真实客户端 IP；绕过 Cloudflare 直连源站的请求，socket 对端不在这些
 * 网段内，伪造的 `CF-Connecting-IP` 不会被采信，限流/审计不受污染。
 *
 * ⚠️ 边界：CF 官方网段包含 Cloudflare WARP 等终端出口段（104.16.0.0/13 等）。若
 * WARP 客户端能**直连**源站端口（默认 compose 暴露 8080 即属此拓扑），其 socket 对端
 * ∈ 上述网段会触发采信——但该场景下 TRUST_PROXY 默认也信任一层 XFF，伪造头本就
 * 可绕过按 IP 限流（详见 validateEnv 告警），WARP 仅属同一边界的边际增量。严格部署
 * 应让源站仅接受 CF 边缘入站（防火墙按 CF 网段收口），而非依赖对端网段判断。
 *
 * 网段来自 Cloudflare 官方发布（https://www.cloudflare.com/ips/，含常用主段；
 * 覆盖绝大多数边缘出口）。官方列表偶尔增补网段，若线上边缘 IP 未命中，请按需
 * 同步新增条目。
 */

// IPv4（2026-09 快照，主段全覆盖）
const CLOUDFLARE_IPV4_NETS: Array<[number, number]> = [
  // [networkUint32, prefixLength]
  ...(
    [
      '173.245.48.0/20',
      '103.21.244.0/22',
      '103.22.200.0/22',
      '103.31.4.0/22',
      '141.101.64.0/18',
      '108.162.192.0/18',
      '190.93.240.0/20',
      '188.114.96.0/20',
      '197.234.240.0/22',
      '198.41.128.0/17',
      '162.158.0.0/15',
      '104.16.0.0/13',
      '104.24.0.0/14',
      '172.64.0.0/13',
      '131.0.72.0/22'
    ] as string[]
  ).map(parseIpv4Cidr)
]

// IPv6（主段全覆盖）
const CLOUDFLARE_IPV6_NETS: Array<[bigint, number]> = [
  ...(
    [
      '2400:cb00::/32',
      '2606:4700::/32',
      '2803:f800::/32',
      '2405:b500::/32',
      '2405:8100::/32',
      '2a06:98c0::/29',
      '2c0f:f248::/32'
    ] as string[]
  ).map(parseIpv6Cidr)
]

function parseIpv4Octets(address: string): number[] | null {
  const parts = address.split('.')
  if (parts.length !== 4) {
    return null
  }

  // 每段必须是纯十进制数字：拒绝前导零、尾随空白、字母后缀等
  // Number.parseInt 的部分解析（'12x'→12、'1.2.3.04'→通过）与 net.isIP 语义不一致，
  // 这里用正则做整段校验（单 '0' 合法，'04' 等前导零非法）。
  const octets: number[] = []
  for (const part of parts) {
    if (!/^(?:0|[1-9]\d{0,2})$/.test(part)) {
      return null
    }
    const octet = Number(part)
    if (octet > 255) {
      return null
    }
    octets.push(octet)
  }
  return octets
}

function ipv4ToUint32(octets: number[]): number {
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0
}

function parseIpv4Cidr(cidr: string): [number, number] {
  const [ipPart, prefixPart] = cidr.split('/')
  const octets = parseIpv4Octets(ipPart)
  if (!octets) {
    throw new Error(`bad ipv4 cidr: ${cidr}`)
  }
  return [ipv4ToUint32(octets), Number.parseInt(prefixPart, 10)]
}

/**
 * 解析 IPv6 文本为 128-bit BigInt（支持 :: 压缩与内嵌 IPv4）。
 * 例：`2606:4700::/32`、`::ffff:104.16.1.2`。
 */
export function parseIpv6ToBigInt(address: string): bigint | null {
  let input = address.toLowerCase().trim()
  if (input.includes('.') && input.startsWith('::ffff:')) {
    // IPv4-mapped IPv6：转 32-bit 嵌在 ::ffff:0:0/96 高位
    const v4 = parseIpv4Octets(input.slice(7))
    if (v4) {
      const lo = BigInt(ipv4ToUint32(v4))
      return (BigInt('0xffff') << 32n) | lo
    }
    // 不是纯 dotted 形态（如 hex 记法 ::ffff:6810:102 或带多余冒号组）→ 落回通用解析
  }

  // 展开内嵌 IPv4（无 ::ffff 前缀的少见形态）
  const embeddedMatch = input.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (embeddedMatch) {
    const v4 = parseIpv4Octets(embeddedMatch[2])
    if (v4) {
      input = `${embeddedMatch[1]}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`
    } else {
      return null
    }
  }

  if (input.includes(':::')) {
    return null
  }

  let head: string[]
  let tail: string[] = []
  const doubleColon = input.indexOf('::')
  if (doubleColon === -1) {
    head = input.split(':')
  } else {
    // 只允许一次 :: 压缩；出现第二段 ::（如 '1::1::1'）属于畸形输入
    if (input.slice(doubleColon + 2).includes('::')) {
      return null
    }
    head = input.slice(0, doubleColon).split(':').filter(Boolean)
    tail = input
      .slice(doubleColon + 2)
      .split(':')
      .filter(Boolean)
  }

  const allGroups = [...head, ...tail]
  if (allGroups.length > 8) {
    return null
  }
  if (doubleColon === -1 && allGroups.length !== 8) {
    return null
  }

  let value = 0n
  for (const group of head) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) {
      return null
    }
    value = (value << 16n) | BigInt(`0x${group}`)
  }
  const missing = 8 - head.length - tail.length
  if (missing < 0) {
    return null
  }
  value <<= 16n * BigInt(missing)
  for (const group of tail) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) {
      return null
    }
    value = (value << 16n) | BigInt(`0x${group}`)
  }
  return value
}

function parseIpv6Cidr(cidr: string): [bigint, number] {
  const [ipPart, prefixPart] = cidr.split('/')
  const value = parseIpv6ToBigInt(ipPart)
  if (value === null) {
    throw new Error(`bad ipv6 cidr: ${cidr}`)
  }
  return [value, Number.parseInt(prefixPart, 10)]
}

const inIpv4Net = (addressUint32: number, [net, prefix]: [number, number]): boolean => {
  if (prefix === 0) {
    return true
  }
  const mask = (~0 << (32 - prefix)) >>> 0
  return (addressUint32 & mask) === (net & mask)
}

const inIpv6Net = (address: bigint, [net, prefix]: [bigint, number]): boolean => {
  if (prefix === 0) {
    return true
  }
  return address >> BigInt(128 - prefix) === net >> BigInt(128 - prefix)
}

/**
 * 判断远端地址是否落在 Cloudflare 官方网段内。
 *
 * 接受 IPv4 / IPv6 / IPv4-mapped IPv6（`::ffff:a.b.c.d`，Node 默认把 IPv4 对端
 * 报成该形态），内部归一化后按族匹配。
 */
export const isCloudflareAddress = (remoteAddress: string): boolean => {
  const raw = String(remoteAddress || '').trim()
  if (!raw) {
    return false
  }

  const version = net.isIP(raw)
  if (version === 4) {
    const octets = parseIpv4Octets(raw)
    return octets ? CLOUDFLARE_IPV4_NETS.some((net) => inIpv4Net(ipv4ToUint32(octets), net)) : false
  }

  if (version === 6) {
    // 统一按 bigint 解析再判断。IPv4-mapped IPv6 无论 dotted（::ffff:a.b.c.d）、
    // hex（::ffff:6810:102）还是其他合法记法，低 32 位都是 IPv4，应命中 IPv4 网段；
    // 非 mapped 的 IPv6 才按 IPv6 网段匹配。
    const value = parseIpv6ToBigInt(raw)
    if (value === null) {
      return false
    }
    // ::ffff:0:0/96 前缀：高 80 位全 0 + 第 3~4 组 0xffff（即 >>32 == 0xffff 且 >>48 == 0）
    if (value >> 32n === 0xffffn && value >> 48n === 0n) {
      const v4 = Number(value & 0xffffffffn)
      return CLOUDFLARE_IPV4_NETS.some((net) => inIpv4Net(v4, net))
    }
    return CLOUDFLARE_IPV6_NETS.some((net) => inIpv6Net(value, net))
  }

  return false
}
