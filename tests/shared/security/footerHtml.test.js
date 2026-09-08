// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { sanitizeFooterHtml } from '../../../src/shared/security/footerHtml.js'

describe('sanitizeFooterHtml numeric character references', () => {
  it('keeps out-of-range decimal references as literal text instead of throwing RangeError', () => {
    // 第 25 轮盲审 M1：String.fromCodePoint 对 > 0x10FFFF 抛 RangeError，而同一清洗跑在
    // settingsService.getPublic() 读路径上，越界值经 restore/手工 SQL 入库会让公开
    // GET /api/settings 对全体访客持续 500。越界引用应保留原文（& 会被转义为 &amp;）。
    expect(() => sanitizeFooterHtml('<p>&#1114112;</p>')).not.toThrow()
    expect(sanitizeFooterHtml('<p>&#1114112;</p>')).toBe('<p>&amp;#1114112;</p>')
  })

  it('keeps out-of-range hex references as literal text', () => {
    expect(() => sanitizeFooterHtml('<p>&#x110000;</p>')).not.toThrow()
    expect(sanitizeFooterHtml('<p>&#x110000;</p>')).toBe('<p>&amp;#x110000;</p>')
  })

  it('still decodes the maximum valid code point (U+10FFFF)', () => {
    expect(() => sanitizeFooterHtml('<p>&#1114111;</p>')).not.toThrow()
    expect(sanitizeFooterHtml('<p>&#1114111;</p>')).toContain('\u{10FFFF}')
  })

  it('still decodes ordinary numeric references in text', () => {
    expect(sanitizeFooterHtml('<p>&#65;</p>')).toBe('<p>A</p>')
  })
})
