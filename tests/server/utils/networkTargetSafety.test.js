// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { resolvePublicHttpTarget } from '../../../src/server/utils/networkTargetSafety.js'

const LINK_CHECK_TARGET_ERROR = '仅支持检测公网 HTTP/HTTPS 地址'

describe('networkTargetSafety', () => {
  describe('resolvePublicHttpTarget', () => {
    it('rejects IPv4-mapped loopback literals before any request can be made', async () => {
      // URL 解析会把 dotted 记法规范化为 hex（[::ffff:127.0.0.1] → [::ffff:7f00:1]），
      // 两种输入都必须被拒
      await expect(resolvePublicHttpTarget('http://[::ffff:127.0.0.1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[::ffff:7f00:1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      // 完整非压缩记法（0:0:0:0:0:ffff:127.0.0.1）
      await expect(resolvePublicHttpTarget('http://[0:0:0:0:0:ffff:127.0.0.1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('rejects IPv4-mapped cloud metadata (169.254.169.254) in dotted and hex form', async () => {
      await expect(resolvePublicHttpTarget('http://[::ffff:169.254.169.254]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[::ffff:a9fe:a9fe]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('rejects RFC 2544 benchmark and RFC 7335 special-use IPv4 literals', async () => {
      // 198.18.0.0/15（RFC 2544 基准测试，部分内网占用）与 192.0.0.0/24（RFC 7335）
      // 曾放行（第 27 轮盲审 L1）
      await expect(resolvePublicHttpTarget('http://198.18.0.1/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://198.19.255.254/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://192.0.0.1/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('rejects TEST-NET and deprecated 6to4 relay IPv4 literals', async () => {
      // 192.0.2.0/24、198.51.100.0/24、203.0.113.0/24（RFC 5737 文档测试）与
      // 192.88.99.0/24（已废弃 6to4 relay anycast）——不可公网路由，防御性封禁（第 31 轮盲审 L2）
      await expect(resolvePublicHttpTarget('http://192.0.2.1/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://198.51.100.7/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://203.0.113.5/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://192.88.99.2/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('allows IPv4-mapped public literals and pins the fixed address', async () => {
      const target = await resolvePublicHttpTarget('http://[::ffff:8.8.8.8]/')
      expect(target.url).toBe('http://[::ffff:808:808]/')
      // address 是 URL 归一化后的规范 hex 记法（剥 [] 的 hostname），不依赖 DNS 输出
      expect(target.address).toBe('::ffff:808:808')
      expect(target.family).toBe(6)
    })

    it('still blocks pure IPv6 private/loopback literals', async () => {
      await expect(resolvePublicHttpTarget('http://[::1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[::]/')).rejects.toThrow(LINK_CHECK_TARGET_ERROR)
      await expect(resolvePublicHttpTarget('http://[fc00::1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[fe80::1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('rejects non-canonical zero-address IPv6 spellings (round-32 M1)', async () => {
      // 未指定地址的拼写变体（::0 / 0:0:0:0:0:0:0:0 / 0::0 / ::0.0.0.0）解析为同一
      // 0 值，此前仅 normalized==='::' 字符串匹配被放行——内核按本机处理，与 0.0.0.0 同族
      await expect(resolvePublicHttpTarget('http://[::0]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[0:0:0:0:0:0:0:0]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[0::0]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[::0.0.0.0]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('rejects deprecated site-local (fec0::/10) and reserved fe00::/9 literals', async () => {
      // 第 24 轮翻案：字符串回退表只覆盖链路本地 fe80-febf（fe8-feb），RFC 3879 已废弃
      // 站点本地 fec0::/10（fec0-feff）与 RFC 4291 保留 fe00-fe7f 曾漏判实测放行；
      // 现按首字节 0xfe 对整段 fe00::/9 位级封锁
      await expect(resolvePublicHttpTarget('http://[fe00::1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[fe0f::1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[fec0::1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[feff::1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('rejects NAT64 (64:ff9b::/96) with a private embedded IPv4', async () => {
      // 环回
      await expect(resolvePublicHttpTarget('http://[64:ff9b::7f00:1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      // 云元数据 169.254.169.254
      await expect(resolvePublicHttpTarget('http://[64:ff9b::a9fe:a9fe]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('rejects NAT64 local-use (64:ff9b:1::/48) with a private embedded IPv4', async () => {
      // 环回（v4 低 32 位、中间全零的文本形态，实测漏放）
      await expect(resolvePublicHttpTarget('http://[64:ff9b:1::7f00:1]:8080/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      // 云元数据 169.254.169.254
      await expect(resolvePublicHttpTarget('http://[64:ff9b:1::a9fe:a9fe]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('rejects the whole NAT64 local-use /48 regardless of inner layout', async () => {
      // local-use 前缀内 NSP 前缀长度 n 不定：n<96 时 v4 位窗高于低 32 位，低 32 位是
      // 转换器忽略的 suffix，可构造成公网 IP（如 2a2a:2a2a）让旧"低 32 位即 v4"判定
      // 提取出公网地址放行，而真实内嵌私网地址（127.0.0.1）位于更高位窗。
      // 第 23 轮修正：对整块 /48 直接封锁，不再尝试提取 v4。
      const n48Layout = '64:ff9b:1:7f:0:100:2a2a:2a2a'
      await expect(resolvePublicHttpTarget(`http://[${n48Layout}]/`)).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      // 即便低 32 位确实是公网 v4（旧实现会放行），整块也不再允许
      await expect(resolvePublicHttpTarget('http://[64:ff9b:1::808:808]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[64:ff9b:1::ffff:808:808]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('rejects IPv4-compatible (::/96) private embedded IPv4 in dotted and hex form', async () => {
      // URL 解析会把 dotted 记法规范化为 hex（[::127.0.0.1] → [::7f00:1]），两种输入都必须被拒
      await expect(resolvePublicHttpTarget('http://[::127.0.0.1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      await expect(resolvePublicHttpTarget('http://[::7f00:1]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      // 云元数据 169.254.169.254
      await expect(resolvePublicHttpTarget('http://[::a9fe:a9fe]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('rejects 6to4 (2002::/16) private embedded IPv4', async () => {
      await expect(resolvePublicHttpTarget('http://[2002:7f00:1::]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      // 完整非压缩记法（组 4~8 全零）
      await expect(resolvePublicHttpTarget('http://[2002:7f00:0001:0:0:0:0:0]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
      // 云元数据 169.254.169.254 → 2002:a9fe:a9fe::
      await expect(resolvePublicHttpTarget('http://[2002:a9fe:a9fe::]/')).rejects.toThrow(
        LINK_CHECK_TARGET_ERROR
      )
    })

    it('allows embedded-IPv4 forms whose inner IPv4 is public (8.8.8.8)', async () => {
      const nat64 = await resolvePublicHttpTarget('http://[64:ff9b::808:808]/')
      expect(nat64.url).toBe('http://[64:ff9b::808:808]/')
      expect(nat64.address).toBe('64:ff9b::808:808')
      expect(nat64.family).toBe(6)

      const compat = await resolvePublicHttpTarget('http://[::8.8.8.8]/')
      expect(compat.url).toBe('http://[::808:808]/')
      // URL 归一化把 dotted 内嵌 v4 转成 hex（::808:808 == 8.8.8.8），address 为规范 hex 形式
      expect(compat.address).toBe('::808:808')
      expect(compat.family).toBe(6)

      const sixToFour = await resolvePublicHttpTarget('http://[2002:808:808::]/')
      expect(sixToFour.url).toBe('http://[2002:808:808::]/')
      expect(sixToFour.address).toBe('2002:808:808::')
      expect(sixToFour.family).toBe(6)
    })
  })
})
