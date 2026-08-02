import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let adminStoreMock: any
let configStoreMock: any
const mountedWrappers: Array<ReturnType<typeof mount>> = []

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

vi.mock('@/store/config', () => ({
  useConfigStore: () => configStoreMock
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

const AdminSidebar = (await import('@/components/admin/AdminSidebar.vue')).default

const createWrapper = (overrides: Record<string, unknown> = {}) => {
  const routerPush = vi.fn()
  const wrapper = mount(AdminSidebar, {
    props: {
      sidebarVisible: false,
      isMobile: false,
      currentView: 'settings',
      menuItems: [
        { id: 'settings', icon: 'icon-settings' },
        { id: 'users', icon: 'icon-users' },
        { id: 'data', icon: 'icon-data' },
        { id: 'monitor', icon: 'icon-monitor' }
      ],
      ...overrides
    },
    global: {
      stubs: {
        AppIcon: true
      },
      mocks: {
        $router: {
          push: routerPush
        }
      }
    }
  })

  mountedWrappers.push(wrapper)

  return { wrapper, routerPush }
}

describe('AdminSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.setAttribute('lang', 'en')
    document.documentElement.setAttribute('theme-mode', 'dark')
    adminStoreMock = {
      isAuthenticated: true,
      user: {
        login: 'alice',
        level: 2,
        avatar_url: ''
      }
    }
    configStoreMock = {
      siteConfig: {
        logoUrl: ''
      },
      displaySiteName: 'StarNav'
    }
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
  })

  it('renders branding and user info, then emits navigation actions', async () => {
    const { wrapper, routerPush } = createWrapper({ isMobile: true })

    expect(wrapper.text()).toContain('StarNav')
    expect(wrapper.text()).toContain('translated:menu.settings')
    expect(wrapper.text()).toContain('translated:menu.users')
    expect(wrapper.text()).toContain('translated:menu.dataManage')
    expect(wrapper.text()).toContain('translated:menu.monitor')
    expect(wrapper.text()).toContain('alice')
    expect(wrapper.text()).toContain('translated:userLevel.vip')
    expect(wrapper.find('.user-avatar.fallback').text()).toBe('A')
    expect(wrapper.find('.menu-item.active').text()).toContain('translated:menu.settings')
    expect(wrapper.find('.extension-btn').exists()).toBe(false)

    await wrapper.find('.logo-group').trigger('click')
    await wrapper.find('.icon-button').trigger('click')
    await wrapper.findAll('.menu-item')[1].trigger('click')
    await wrapper.find('.logout-btn').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/')
    expect(wrapper.emitted('close-sidebar')).toEqual([[]])
    expect(wrapper.emitted('menu-click')).toEqual([['users']])
    expect(wrapper.emitted('logout')).toEqual([[]])
  })
})
