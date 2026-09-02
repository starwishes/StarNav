// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isCloudflareAddress, parseIpv6ToBigInt } from '../../../src/server/utils/cloudflareIp.js'

describe('cloudflareIp', () => {
  describe('parseIpv6ToBigInt', () => {
    it('parses full and compressed IPv6', () => {
      expect(parseIpv6ToBigInt('2606:4700::')!.toString(16)).toBe(`26064700${'0'.repeat(24)}`)
      expect(parseIpv6ToBigInt('2606:4700:0000:0000:0000:0000:0000:0000')!.toString(16)).toBe(
        `26064700${'0'.repeat(24)}`
      )
      expect(parseIpv6ToBigInt('::1')!.toString(16)).toBe('1')
      expect(
        parseIpv6ToBigInt('2a06:98c0:3600::103')!.toString(16).startsWith('2a0698c03600')
      ).toBe(true)
    })

    it('parses IPv4-mapped IPv6 as ::ffff:0:0/96', () => {
      const value = parseIpv6ToBigInt('::ffff:104.16.1.2')
      expect(value).not.toBeNull()
      expect(value!.toString(16)).toBe('ffff68100102')
    })

    it('returns null for invalid input', () => {
      expect(parseIpv6ToBigInt('')).toBeNull()
      expect(parseIpv6ToBigInt('not-an-ip')).toBeNull()
      expect(parseIpv6ToBigInt('1:2:3:4:5:6:7:8:9')).toBeNull()
      expect(parseIpv6ToBigInt('2606:4700::12345')).toBeNull()
      expect(parseIpv6ToBigInt('1:2:3')).toBeNull()
    })
  })

  describe('isCloudflareAddress', () => {
    it('matches Cloudflare IPv4 edge ranges', () => {
      expect(isCloudflareAddress('104.22.18.44')).toBe(true)
      expect(isCloudflareAddress('104.23.251.5')).toBe(true)
      expect(isCloudflareAddress('172.70.207.146')).toBe(true)
      expect(isCloudflareAddress('104.16.0.1')).toBe(true)
      expect(isCloudflareAddress('162.158.255.255')).toBe(true)
      expect(isCloudflareAddress('173.245.48.1')).toBe(true)
    })

    it('rejects non-Cloudflare IPv4 addresses', () => {
      expect(isCloudflareAddress('8.8.8.8')).toBe(false)
      expect(isCloudflareAddress('203.0.113.7')).toBe(false)
      expect(isCloudflareAddress('192.168.1.1')).toBe(false)
      expect(isCloudflareAddress('104.15.255.255')).toBe(false) // 紧邻 104.16.0.0/13 之外
      expect(isCloudflareAddress('172.63.255.255')).toBe(false) // 紧邻 172.64.0.0/13 之外
    })

    it('matches Cloudflare IPv6 edge ranges and IPv4-mapped forms', () => {
      expect(isCloudflareAddress('2606:4700::1')).toBe(true)
      expect(isCloudflareAddress('2400:cb00:2049:1::c629:d7a2')).toBe(true)
      expect(isCloudflareAddress('::ffff:104.23.251.5')).toBe(true)
      expect(isCloudflareAddress('::ffff:8.8.8.8')).toBe(false)
      expect(isCloudflareAddress('2001:4860:4860::8888')).toBe(false)
    })

    it('rejects garbage or empty input', () => {
      expect(isCloudflareAddress('')).toBe(false)
      expect(isCloudflareAddress('not-an-ip')).toBe(false)
    })
  })
})
