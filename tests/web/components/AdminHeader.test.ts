import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let locale = 'zh-CN'
let configStoreMock: any

const mocks = vi.hoisted(() => ({
  setLocale: vi.fn(),
  messageSuccess: vi.fn()
}))

vi.mock('@/plugins/i18n', () => ({
  getLocale: () => locale,
  setLocale: mocks.setLocale
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess
  }
}))

vi.mock('@/store/config', () => ({
  useConfigStore: () => configStoreMock
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

const AdminHeader = (await import('@/components/admin/AdminHeader.vue')).default

const createWrapper = (overrides: Record<string, unknown> = {}) =>
  mount(AdminHeader, {
    props: {
      isMobile: false,
      currentViewLabel: 'Settings',
      ...overrides
    },
    global: {
      stubs: {
        AppIcon: true
      }
    }
  })

describe('AdminHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    locale = 'zh-CN'
    configStoreMock = {
      siteConfig: {}
    }
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('theme-mode')
  })

  it('renders the current view label and emits header actions', async () => {
    const wrapper = createWrapper({ isMobile: true })

    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.find('.breadcrumb-trail').exists()).toBe(false)

    await wrapper.find('.menu-toggle-btn').trigger('click')
    await wrapper.find('.action-btn').trigger('click')

    expect(wrapper.emitted('open-sidebar')).toEqual([[]])
    expect(wrapper.emitted('go-home')).toEqual([[]])
    expect(wrapper.find('.refresh-btn').exists()).toBe(false)
  })

  it('toggles the locale from Chinese to English', async () => {
    const wrapper = createWrapper()

    expect(wrapper.find('.lang-btn').html()).toContain('文<sub>A</sub>')

    await wrapper.find('.lang-btn').trigger('click')

    expect(mocks.setLocale).toHaveBeenCalledWith('en-US')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('Switched to English')
  })

  it('toggles the locale from English to Chinese', async () => {
    locale = 'en-US'
    const wrapper = createWrapper()

    expect(wrapper.find('.lang-btn').html()).toContain('A<sub>文</sub>')

    await wrapper.find('.lang-btn').trigger('click')

    expect(mocks.setLocale).toHaveBeenCalledWith('zh-CN')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('已切换至中文')
  })

  it('applies the saved theme mode and toggles it from the header', async () => {
    localStorage.setItem('theme-mode', 'dark')
    const wrapper = createWrapper()
    await nextTick()

    expect(document.documentElement.getAttribute('theme-mode')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(wrapper.find('.theme-btn').attributes('title')).toBe('translated:nav.switchToLight')

    await wrapper.find('.theme-btn').trigger('click')

    expect(document.documentElement.getAttribute('theme-mode')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme-mode')).toBe('light')
  })
})
