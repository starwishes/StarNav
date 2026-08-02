import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let localeRef: ReturnType<typeof ref<string>>
let configStoreMock: any
const mountedWrappers: Array<ReturnType<typeof mount>> = []

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: localeRef
  })
}))

vi.mock('@/store/config', () => ({
  useConfigStore: () => configStoreMock
}))

const Clock = (await import('../../../src/web/components/index/Clock.vue')).default

const createWrapper = () => {
  const wrapper = mount(Clock)
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('Clock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    localeRef = ref('zh-CN')
    configStoreMock = reactive({
      siteConfig: reactive({
        timezone: 'Asia/Shanghai'
      })
    })
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('formats zh-CN separators and refreshes every second from shared config state', async () => {
    let callCount = 0
    vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation((_locale, options) => {
      if (options && typeof options === 'object' && 'timeZone' in options) {
        callCount += 1
        return callCount === 1 ? '08:09:10' : '08:09:11'
      }

      return '00:00:00'
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('08')
    expect(wrapper.text()).toContain('时')
    expect(wrapper.text()).toContain('分')
    expect(wrapper.text()).toContain('秒')

    await vi.advanceTimersByTimeAsync(1000)

    expect(wrapper.text()).toContain('11')
  })

  it('falls back to the local timezone on invalid config timezones', async () => {
    localeRef = ref('en-US')
    configStoreMock.siteConfig.timezone = 'Invalid/Zone'

    vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation((_locale, options) => {
      if (options && typeof options === 'object' && 'timeZone' in options) {
        throw new RangeError('Invalid timezone')
      }

      return '11:12:13'
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('11')
    expect(wrapper.text()).toContain(':')
    expect(wrapper.text()).not.toContain('时')
    expect(wrapper.text()).not.toContain('秒')
  })
})
