// @vitest-environment node
//
// 真实 ipKeyGenerator 直通测试（不 mock express-rate-limit）。
// limiter.test.js 在文件级 vi.mock('express-rate-limit')，同一文件无法再取真实模块，
// 故独立成文件——补上 limiter 测试对“IPv6 /56 子网归一”与“IPv4-mapped → IPv4”的盲区：
// 这些是限流键安全语义的一部分（IPv6 地址若不归一，攻击者可轮换主机位绕过按 IP 限流；
// IPv4-mapped 不转回 IPv4 则会与纯 IPv4 键分桶）。
import { describe, expect, it } from 'vitest'
import { ipKeyGenerator } from 'express-rate-limit'

describe('express-rate-limit real ipKeyGenerator', () => {
  it('normalizes IPv6 addresses into the same /56 subnet bucket', () => {
    const subnetBucket = '2001:db8:1234:5600::/56'
    expect(ipKeyGenerator('2001:db8:1234:5678::1')).toBe(subnetBucket)
    expect(ipKeyGenerator('2001:db8:1234:56ff:ffff:ffff:ffff:ffff')).toBe(subnetBucket)
  })

  it('separates IPv6 addresses that fall into different /56 subnets', () => {
    expect(ipKeyGenerator('2001:db8:1234:5700::1')).not.toBe('2001:db8:1234:5600::/56')
    expect(ipKeyGenerator('2001:db8:1234:5700::1')).toBe('2001:db8:1234:5700::/56')
  })

  it('converts IPv4-mapped IPv6 addresses to plain IPv4', () => {
    // dotted 记法（Node 默认把 IPv4 对端报成 ::ffff:a.b.c.d）
    expect(ipKeyGenerator('::ffff:203.0.113.7')).toBe('203.0.113.7')
    // hex 记法（::ffff:cb00:7107 == ::ffff:203.0.113.7）
    expect(ipKeyGenerator('::ffff:cb00:7107')).toBe('203.0.113.7')
  })

  it('passes plain IPv4 through unchanged', () => {
    expect(ipKeyGenerator('203.0.113.7')).toBe('203.0.113.7')
    expect(ipKeyGenerator('198.51.100.2')).toBe('198.51.100.2')
  })
})
