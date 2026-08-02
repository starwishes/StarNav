import { describe, expect, it } from 'vitest'
import { describeUserAgent } from '@/utils/userAgent'

describe('describeUserAgent', () => {
  it('maps common desktop and mobile user agents to readable labels', () => {
    expect(describeUserAgent('Mozilla Windows Chrome')).toBe('Windows Chrome')
    expect(describeUserAgent('Mozilla Windows Firefox')).toBe('Windows Firefox')
    expect(describeUserAgent('Mozilla Mac Safari')).toBe('Mac Safari')
    expect(describeUserAgent('Mozilla Mac Chrome')).toBe('Mac Chrome')
    expect(describeUserAgent('Mozilla iPhone')).toBe('iPhone')
    expect(describeUserAgent('Mozilla Android')).toBe('Android')
    expect(describeUserAgent('Mozilla Linux')).toBe('Linux')
  })

  it('uses the fallback for empty agents and truncates unknown strings', () => {
    expect(describeUserAgent('', 'fallback')).toBe('fallback')
    expect(describeUserAgent('unknown', 'fallback')).toBe('fallback')
    expect(describeUserAgent('VeryLongCustomAgentStringThatShouldBeTrimmed')).toBe(
      'VeryLongCustomAgentStringThatS...'
    )
  })
})
