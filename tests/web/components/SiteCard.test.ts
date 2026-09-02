import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

const SiteCard = (await import('@/components/index/SiteCard.vue')).default

const baseItem = {
  id: 1,
  name: 'GitHub',
  description: 'Where the world builds software',
  url: 'https://github.com',
  categoryId: 7,
  pinned: false
}

const createWrapper = (overrides: Record<string, unknown> = {}) =>
  mount(SiteCard, {
    props: {
      item: baseItem,
      faviconUrl: 'https://github.com/favicon.ico',
      ...overrides
    },
    global: {
      stubs: {
        AppIcon: true
      }
    }
  })

describe('SiteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders text content, a real favicon, and the pinned badge', () => {
    const wrapper = createWrapper({
      item: {
        ...baseItem,
        pinned: true
      }
    })

    expect(wrapper.find('.site-name').text()).toBe('GitHub')
    expect(wrapper.find('.site-desc').text()).toBe('Where the world builds software')
    expect(wrapper.find('img.site-icon').attributes('src')).toBe('https://github.com/favicon.ico')
    // 装饰性 favicon 用空 alt，站点名紧邻可读
    expect(wrapper.find('img.site-icon').attributes('alt')).toBe('')
    expect(wrapper.find('.site-card').classes()).toContain('is-pinned')
    expect(wrapper.find('.pin-badge').exists()).toBe(true)
    // 置顶 emoji 对读屏隐藏，改由 sr-only 文本播报
    expect(wrapper.find('.pin-badge').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.sr-only').text()).toBe('translated:site.pinnedBadge')
  })

  it('falls back from the explicit icon to the site origin, proxy icon, and default app icon before showing the placeholder', async () => {
    const wrapper = createWrapper({
      faviconUrl: 'https://cdn.test/github.png',
      fallbackFaviconUrl: 'https://favicon.test/?url=https://github.com'
    })

    expect(wrapper.find('img.site-icon').attributes('src')).toBe('https://cdn.test/github.png')

    await wrapper.find('img.site-icon').trigger('error')
    expect(wrapper.find('img.site-icon').attributes('src')).toBe('https://github.com/favicon.ico')

    await wrapper.find('img.site-icon').trigger('error')
    expect(wrapper.find('img.site-icon').attributes('src')).toBe(
      'https://favicon.test/?url=https://github.com'
    )

    await wrapper.find('img.site-icon').trigger('error')
    expect(wrapper.find('img.site-icon').attributes('src')).toBe('/logo.svg?v=2')

    await wrapper.find('img.site-icon').trigger('error')
    expect(wrapper.find('.site-icon-placeholder').text()).toBe('G')
  })

  it('skips unusable explicit icon values and still renders the site favicon fallback', () => {
    const wrapper = createWrapper({
      faviconUrl: 'icon-md-code',
      fallbackFaviconUrl: 'https://favicon.test/?url=https://github.com'
    })

    expect(wrapper.find('img.site-icon').attributes('src')).toBe('https://github.com/favicon.ico')
  })

  it('remembers missing favicon targets across remounts and shows the default app icon immediately', async () => {
    const firstWrapper = createWrapper({
      faviconUrl: 'https://cdn.test/github.png',
      fallbackFaviconUrl: 'https://favicon.test/?url=https://github.com'
    })

    await firstWrapper.find('img.site-icon').trigger('error')
    await firstWrapper.find('img.site-icon').trigger('error')
    await firstWrapper.find('img.site-icon').trigger('error')
    await firstWrapper.find('img.site-icon').trigger('error')

    expect(firstWrapper.find('.site-icon-placeholder').text()).toBe('G')
    firstWrapper.unmount()

    const secondWrapper = createWrapper({
      faviconUrl: 'https://cdn.test/github.png',
      fallbackFaviconUrl: 'https://favicon.test/?url=https://github.com'
    })

    expect(secondWrapper.find('img.site-icon').exists()).toBe(true)
    expect(secondWrapper.find('img.site-icon').attributes('src')).toBe('/logo.svg?v=2')
  })

  it('falls back to the default app icon when no usable favicon candidate exists', () => {
    const wrapper = createWrapper({
      item: {
        ...baseItem,
        url: 'not a valid url'
      },
      faviconUrl: 'favicon.ico',
      fallbackFaviconUrl: 'javascript:alert(1)'
    })

    expect(wrapper.find('img.site-icon').exists()).toBe(true)
    expect(wrapper.find('img.site-icon').attributes('src')).toBe('/logo.svg?v=2')
  })

  it('emits click, touchstart, and contextmenu in normal browsing mode', async () => {
    const wrapper = createWrapper()

    await wrapper.find('a').trigger('click')
    await wrapper.find('a').trigger('touchstart')
    await wrapper.find('.site-card-wrapper').trigger('contextmenu')

    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.emitted('touchstart')).toHaveLength(1)
    expect(wrapper.emitted('contextmenu')).toHaveLength(1)
    expect(wrapper.emitted('toggle-select')).toBeUndefined()
  })

  it('switches to selection mode, disables the link, and emits toggle-select from wrapper clicks', async () => {
    const wrapper = createWrapper({
      selectionMode: true,
      selected: true
    })

    // 选择模式下保留真实 href，保证键盘可达/读屏可识别链接；
    // 点击行为由 wrapper 分派到 toggle-select。
    expect(wrapper.find('a').attributes('href')).toBe('https://github.com')
    expect(wrapper.find('a').classes()).toContain('is-disabled')
    expect(wrapper.find('a').attributes('role')).toBe('checkbox')
    expect(wrapper.find('a').attributes('aria-checked')).toBe('true')
    expect(wrapper.find('.site-card').classes()).toContain('selection-mode')
    expect(wrapper.find('.site-card').classes()).toContain('is-selected')
    expect(wrapper.find('.checkbox-inner').classes()).toContain('checked')

    await wrapper.find('.site-card-wrapper').trigger('click')

    expect(wrapper.emitted('toggle-select')).toEqual([[]])
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('exposes unselected checkbox semantics in selection mode', () => {
    const wrapper = createWrapper({
      selectionMode: true,
      selected: false
    })

    expect(wrapper.find('a').attributes('role')).toBe('checkbox')
    expect(wrapper.find('a').attributes('aria-checked')).toBe('false')
  })
})
