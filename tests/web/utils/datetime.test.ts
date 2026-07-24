import { describe, expect, it, vi } from 'vitest'
import { formatDateTime } from '@/utils/datetime'

describe('formatDateTime', () => {
  it('returns the configured fallback for empty or invalid input', () => {
    expect(formatDateTime(null, { fallback: 'N/A' })).toBe('N/A')
    expect(formatDateTime('not-a-date', { fallback: 'N/A' })).toBe('N/A')
  })

  it('formats valid values with locale and timezone options', () => {
    const result = formatDateTime('2026-04-13T10:00:00.000Z', {
      locale: 'en-GB',
      timeZone: 'Asia/Shanghai'
    })

    expect(result).toContain('13/04/2026')
  })

  it('falls back to toLocaleString when Intl.DateTimeFormat throws', () => {
    const formatterSpy = vi
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation(function MockDateTimeFormat() {
        throw new Error('intl failed')
      } as unknown as typeof Intl.DateTimeFormat)
    const localeSpy = vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('locale-fallback')

    expect(formatDateTime('2026-04-13T10:00:00.000Z', { locale: 'en-US' })).toBe('locale-fallback')

    formatterSpy.mockRestore()
    localeSpy.mockRestore()
  })
})
