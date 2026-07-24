import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let locale = 'zh-CN'
let routerPushMock: ReturnType<typeof vi.fn>
let currentRoute: ReturnType<typeof ref<{ path: string }>>
let adminStoreMock: any
let configStoreMock: any
let toggleSidebarMock: ReturnType<typeof vi.fn>
const mountedWrappers: Array<ReturnType<typeof mount>> = []

const mocks = vi.hoisted(() => ({
  setLocale: vi.fn(),
  messageSuccess: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPushMock,
    currentRoute
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

vi.mock('@/plugins/i18n', () => ({
  getLocale: () => locale,
  setLocale: mocks.setLocale
}))

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

vi.mock('@/store/config', () => ({
  useConfigStore: () => configStoreMock
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess
  }
}))

const LoginDialogStub = defineComponent({
  name: 'LoginDialog',
  props: ['modelValue'],
  setup(props) {
    return () => h('div', { class: 'login-dialog-stub' }, String(props.modelValue))
  }
})

const ClockStub = defineComponent({
  name: 'Clock',
  setup() {
    return () => h('div', { class: 'clock-stub' }, 'clock')
  }
})

const PageHeader = (await import('@/components/index/PageHeader.vue')).default

const findMenuItemByText = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('.admin-menu-item').find((node) => node.text().includes(text))

const createWrapper = () => {
  const wrapper = mount(PageHeader, {
    global: {
      provide: {
        toggleSidebar: toggleSidebarMock
      },
      stubs: {
        Clock: ClockStub,
        LoginDialog: LoginDialogStub
      }
    }
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

describe('PageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    locale = 'zh-CN'
    routerPushMock = vi.fn()
    currentRoute = ref({ path: '/current' })
    toggleSidebarMock = vi.fn()
    adminStoreMock = reactive({
      isAuthenticated: false,
      user: null,
      logout: vi.fn().mockResolvedValue(undefined)
    })
    configStoreMock = reactive({
      siteConfig: reactive({
        homeUrl: '',
        themePreset: 'classic',
        themeColor: ''
      })
    })

    localStorage.clear()
    document.body.innerHTML = ''
    document.head.innerHTML = ''
    document.documentElement.className = ''
    document.documentElement.removeAttribute('theme-mode')
    document.title = ''
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0
    })
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    vi.restoreAllMocks()
  })

  it('opens the login dialog, toggles the sidebar, switches locale, and reacts to scroll', async () => {
    localStorage.setItem('theme-mode', 'dark')

    const wrapper = createWrapper()
    await nextTick()

    expect(wrapper.text()).toContain('translated:nav.login')
    expect(wrapper.find('.login-dialog-stub').text()).toBe('false')
    expect(document.documentElement.getAttribute('theme-mode')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await wrapper.find('.sidebar-toggle-btn').trigger('click')
    expect(toggleSidebarMock).toHaveBeenCalledTimes(1)

    await findMenuItemByText(wrapper, 'translated:nav.login')!.trigger('click')
    await nextTick()
    expect(wrapper.find('.login-dialog-stub').text()).toBe('true')

    await wrapper.find('.lang-toggle').trigger('click')
    expect(mocks.setLocale).toHaveBeenCalledWith('en-US')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('Switched to English')

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 48
    })
    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(wrapper.find('.head').classes()).toContain('headsp')
  })

  it('keeps a single visible home entry in the header', async () => {
    const wrapper = createWrapper()
    await nextTick()

    expect(wrapper.find('.brand-chip').exists()).toBe(false)
    expect(wrapper.find('.menu').exists()).toBe(true)
    expect(wrapper.find('.menu-item').text()).toContain('translated:nav.home')
    expect(wrapper.text().match(/translated:nav\.home/g)).toHaveLength(1)
  })

  it('routes home clicks through relative urls and the default in-app fallback', async () => {
    const wrapper = createWrapper()

    configStoreMock.siteConfig.homeUrl = '/docs'
    await wrapper.find('.menu-item').trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith('/docs')

    routerPushMock.mockClear()
    configStoreMock.siteConfig.homeUrl = ''
    currentRoute.value = { path: '/admin/dashboard' }

    await wrapper.find('.menu-item').trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith('/')
  })

  it('falls back to browser navigation for absolute urls and page reloads', async () => {
    const wrapper = createWrapper()

    configStoreMock.siteConfig.homeUrl = 'https://external.test/welcome'
    currentRoute.value = { path: '/admin' }

    await wrapper.find('.menu-item').trigger('click')
    expect(routerPushMock).not.toHaveBeenCalled()

    configStoreMock.siteConfig.homeUrl = ''
    currentRoute.value = { path: '/' }

    await wrapper.find('.menu-item').trigger('click')
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('shows admin actions for authenticated users and handles admin navigation plus logout', async () => {
    adminStoreMock.isAuthenticated = true
    adminStoreMock.user = { username: 'admin', level: 3 }

    const wrapper = createWrapper()
    await nextTick()

    expect(wrapper.text()).toContain('translated:nav.admin')
    expect(wrapper.text()).toContain('translated:nav.logout')
    expect(wrapper.text()).not.toContain('translated:nav.login')

    await findMenuItemByText(wrapper, 'translated:nav.admin')!.trigger('click')
    expect(routerPushMock).toHaveBeenCalledWith('/admin/dashboard')

    await wrapper.find('.logout-btn').trigger('click')
    expect(adminStoreMock.logout).toHaveBeenCalledTimes(1)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:auth.logoutSuccess')
  })

  it('hides the admin entry for non-admin authenticated users while keeping logout available', async () => {
    adminStoreMock.isAuthenticated = true
    adminStoreMock.user = { username: 'alice', level: 1 }

    const wrapper = createWrapper()
    await nextTick()

    expect(wrapper.text()).not.toContain('translated:nav.admin')
    expect(wrapper.text()).toContain('translated:nav.logout')
  })
})
