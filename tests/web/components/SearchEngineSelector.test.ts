import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config', () => ({
  Favicon: 'https://favicon.test/?url='
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

const SearchEngineSelector = (await import('@/components/index/SearchEngineSelector.vue')).default
const wrappers: Array<ReturnType<typeof mount>> = []

const createWrapper = (overrides: Record<string, unknown> = {}) => {
  const wrapper = mount(SearchEngineSelector, {
    props: {
      engines: [
        { name: '百度', url: 'https://www.baidu.com/s?wd=' },
        { name: 'Google', url: 'https://www.google.com/search?q=' }
      ],
      currentEngine: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
      searchMode: 'local',
      showActions: true,
      ...overrides
    },
    attachTo: document.body,
    global: {
      stubs: {
        AppIcon: true
      }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('SearchEngineSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount()
    }
    document.body.innerHTML = ''
  })

  it('opens the menu, switches to online mode, and selects engines', async () => {
    const wrapper = createWrapper()

    expect(document.body.querySelector('.engine-panel')).toBeNull()
    await wrapper.find('.engine-btn').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:searchMode')).toEqual([['online']])
    expect(wrapper.emitted('menu-open-change')).toEqual([[true]])
    expect(document.body.querySelector('.engine-panel')).not.toBeNull()

    const engineItems = document.body.querySelectorAll<HTMLButtonElement>(
      '.engine-item:not(.add-btn)'
    )
    expect(engineItems).toHaveLength(2)
    engineItems[1].click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('select')).toEqual([
      [{ name: 'Google', url: 'https://www.google.com/search?q=' }]
    ])
    expect(wrapper.emitted('update:searchMode')).toEqual([['online'], ['online']])
    expect(wrapper.emitted('menu-open-change')).toEqual([[true], [false]])
    expect(document.body.querySelector('.engine-panel')).toBeNull()
  })

  it('forwards add/edit/delete/move actions and closes on outside clicks', async () => {
    const wrapper = createWrapper()
    await wrapper.find('.engine-btn').trigger('click')
    await wrapper.vm.$nextTick()

    const actionIcons = document.body.querySelectorAll<HTMLElement>('.action-group .action-icon')
    // 第一项的“上移”为 disabled 按钮：jsdom 不会派发 click，也不应产生 move
    expect((actionIcons[0] as HTMLButtonElement).disabled).toBe(true)
    actionIcons[0].click()
    await wrapper.vm.$nextTick()
    // 第一项的“下移”有效
    actionIcons[1].click()
    await wrapper.vm.$nextTick()
    actionIcons[2].click()
    await wrapper.vm.$nextTick()
    actionIcons[3].click()
    await wrapper.vm.$nextTick()
    await wrapper.find('.engine-btn').trigger('click')
    await wrapper.vm.$nextTick()
    document.body.querySelector<HTMLButtonElement>('.add-btn')?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('move')).toEqual([[0, 1]])
    expect(wrapper.emitted('edit')).toEqual([
      [{ name: '百度', url: 'https://www.baidu.com/s?wd=' }, 0]
    ])
    expect(wrapper.emitted('delete')).toEqual([[0]])
    expect(wrapper.emitted('add')).toEqual([[]])

    await wrapper.find('.engine-btn').trigger('click')
    document.body.click()
    await wrapper.vm.$nextTick()

    const menuOpenChanges = wrapper.emitted('menu-open-change')
    expect(menuOpenChanges?.[menuOpenChanges.length - 1]).toEqual([false])
    expect(document.body.querySelector('.engine-panel')).toBeNull()
  })

  it('marks only the matching id as active when multiple engines share the same name', async () => {
    const wrapper = createWrapper({
      engines: [
        { id: 'google-global', name: 'Google', url: 'https://www.google.com/search?q=' },
        { id: 'google-cn', name: 'Google', url: 'https://www.google.com.hk/search?q=' }
      ],
      currentEngine: { id: 'google-cn', name: 'Google', url: 'https://www.google.com.hk/search?q=' }
    })

    await wrapper.find('.engine-btn').trigger('click')
    await wrapper.vm.$nextTick()

    const activeItems = Array.from(document.body.querySelectorAll('.engine-item.active'))

    expect(activeItems).toHaveLength(1)
    expect(activeItems[0]?.textContent).toContain('Google')
  })

  it('positions the teleported menu within the viewport when there is not enough space below', async () => {
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 360
    })

    const wrapper = createWrapper({
      engines: [
        { name: '百度', url: 'https://www.baidu.com/s?wd=' },
        { name: 'Bing', url: 'https://www.bing.com/search?q=' },
        { name: 'Google', url: 'https://www.google.com/search?q=' },
        { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
        { name: 'Brave', url: 'https://search.brave.com/search?q=' }
      ]
    })

    const trigger = wrapper.find('.engine-btn').element as HTMLButtonElement
    trigger.getBoundingClientRect = () =>
      ({
        top: 300,
        bottom: 344,
        left: 24,
        right: 68,
        width: 44,
        height: 44,
        x: 24,
        y: 300,
        toJSON() {
          return {}
        }
      }) as DOMRect

    await wrapper.find('.engine-btn').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const panel = document.body.querySelector<HTMLElement>('.engine-panel')

    expect(panel).not.toBeNull()
    expect(Number.parseFloat(panel?.style.top || '0')).toBeLessThan(300)
    expect(Number.parseFloat(panel?.style.maxHeight || '0')).toBeGreaterThan(0)

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight
    })
  })

  it('shows a search-only badge for engines without suggestions support', async () => {
    const wrapper = createWrapper({
      engines: [{ name: 'Brave', url: 'https://search.brave.com/search?q=' }],
      currentEngine: { name: 'Brave', url: 'https://search.brave.com/search?q=' }
    })

    await wrapper.find('.engine-btn').trigger('click')
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.search-capability-badge')?.textContent).toContain(
      'translated:engine.searchOnlyBadge'
    )
  })

  it('renders fallback icon state when the current engine has no url', () => {
    const wrapper = createWrapper({
      currentEngine: null,
      showActions: false
    })

    expect(
      wrapper.find('.fallback-icon-stub').exists() ||
        wrapper.findComponent({ name: 'AppIcon' }).exists()
    ).toBe(true)
  })

  it('falls back from origin favicon to proxy, then the placeholder badge', async () => {
    const wrapper = createWrapper({
      currentEngine: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
      showActions: false
    })

    const currentIcon = () => wrapper.find('.engine-btn .engine-icon')

    expect(currentIcon().attributes('src')).toBe('https://www.baidu.com/favicon.ico')

    await currentIcon().trigger('error')
    expect(currentIcon().attributes('src')).toBe('https://favicon.test/?url=https://www.baidu.com')

    await currentIcon().trigger('error')
    expect(wrapper.find('.engine-btn .engine-icon-badge').exists()).toBe(true)
    expect(wrapper.find('.engine-btn .engine-icon-badge').text()).toBe('百')
    expect(wrapper.find('.engine-btn .engine-icon').exists()).toBe(false)
  })

  it('retries engine icons on remount after a previous failure', async () => {
    const firstWrapper = createWrapper({
      currentEngine: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
      showActions: false
    })

    const currentIcon = () => firstWrapper.find('.engine-btn .engine-icon')

    await currentIcon().trigger('error')
    await currentIcon().trigger('error')

    expect(firstWrapper.find('.engine-btn .engine-icon-badge').exists()).toBe(true)
    firstWrapper.unmount()

    const secondWrapper = createWrapper({
      currentEngine: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
      showActions: false
    })

    expect(secondWrapper.find('.engine-btn .engine-icon').exists()).toBe(true)
    expect(secondWrapper.find('.engine-btn .engine-icon').attributes('src')).toBe(
      'https://www.baidu.com/favicon.ico'
    )
  })
})
