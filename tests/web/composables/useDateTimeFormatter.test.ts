import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let configStoreMock: any
const mocks = vi.hoisted(() => ({
  formatDateTime: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: ref('en-US')
  })
}))

vi.mock('@/store/config', () => ({
  useConfigStore: () => configStoreMock
}))

vi.mock('@/utils/datetime', () => ({
  formatDateTime: mocks.formatDateTime
}))

const { useDateTimeFormatter } = await import('@/composables/useDateTimeFormatter')

describe('useDateTimeFormatter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configStoreMock = {
      siteConfig: {
        timezone: 'Asia/Shanghai'
      }
    }
    mocks.formatDateTime.mockReturnValue('formatted')
  })

  it('passes locale, timezone, and fallback through to the shared formatter', () => {
    const formatter = useDateTimeFormatter()

    expect(formatter.formatDateTime('2026-04-13T10:00:00.000Z', 'N/A')).toBe('formatted')
    expect(mocks.formatDateTime).toHaveBeenCalledWith('2026-04-13T10:00:00.000Z', {
      locale: 'en-US',
      timeZone: 'Asia/Shanghai',
      fallback: 'N/A'
    })
  })
})
