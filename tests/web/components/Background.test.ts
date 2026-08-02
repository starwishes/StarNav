import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let configStoreMock: any
const mountedWrappers: Array<ReturnType<typeof mount>> = []

vi.mock('@/store/config', () => ({
  useConfigStore: () => configStoreMock
}))

const Background = (await import('@/components/index/Background.vue')).default

const createWrapper = (props: Record<string, unknown> = {}) => {
  const wrapper = mount(Background, {
    props
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('Background', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configStoreMock = reactive({
      siteConfig: reactive({
        backgroundUrl: '/uploads/bg.jpg'
      })
    })
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    vi.restoreAllMocks()
  })

  it('does not re-paint the custom background image (body owns fixed cover)', async () => {
    const wrapper = createWrapper()
    await nextTick()

    // Config store applies backgroundUrl to document.body; this component only
    // dims the hero so the same image is never cropped twice (horizontal seam).
    expect(wrapper.find('.bg').classes()).toContain('is-custom')
    expect(wrapper.find('.bg').attributes('style') || '').not.toContain('/uploads/bg.jpg')
    expect(wrapper.find('.bg-overlay').exists()).toBe(true)
    expect(wrapper.find('.bg-stars-near').exists()).toBe(false)
  })

  it('renders the default artwork when no custom background is configured', async () => {
    configStoreMock.siteConfig.backgroundUrl = ''

    const wrapper = createWrapper()
    await nextTick()

    expect(wrapper.find('.bg').classes()).toContain('is-default-art')
    expect(wrapper.find('.bg-stars-near').exists()).toBe(true)
    expect(wrapper.find('.bg-orb').exists()).toBe(true)
  })

  it('keeps the default artwork hidden while the homepage shell is still loading', async () => {
    configStoreMock.siteConfig.backgroundUrl = ''

    const wrapper = createWrapper({ visible: false })
    await nextTick()

    expect(wrapper.find('.bg').classes()).toContain('is-deferred')
    expect(wrapper.find('.bg-stars-near').exists()).toBe(false)
    expect(wrapper.find('.bg-orb').exists()).toBe(false)
  })
})
