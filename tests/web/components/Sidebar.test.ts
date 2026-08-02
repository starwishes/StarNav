import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let adminStoreMock: any
let toggleSidebarMock: ReturnType<typeof vi.fn>
const mountedWrappers: Array<ReturnType<typeof mount>> = []

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

const Sidebar = (await import('@/components/index/Sidebar.vue')).default

const createWrapper = () => {
  const wrapper = mount(Sidebar, {
    global: {
      provide: {
        toggleSidebar: toggleSidebarMock
      }
    }
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminStoreMock = {
      isAuthenticated: true
    }
    toggleSidebarMock = vi.fn()

    vi.stubGlobal('scrollTo', vi.fn())
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0
    })
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows the rocket action after scrolling, scrolls to top, toggles the sidebar, and emits add actions', async () => {
    const wrapper = createWrapper()

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 420
    })
    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(wrapper.find('button[title="返回顶部"]').exists()).toBe(true)

    await wrapper.find('button[title="返回顶部"]').trigger('click')
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth'
    })

    await wrapper.find('button[title="菜单"]').trigger('click')
    expect(toggleSidebarMock).toHaveBeenCalledTimes(1)

    await wrapper.find('button[title="添加"]').trigger('click')
    await nextTick()
    expect(wrapper.find('.fab-action-menu').exists()).toBe(true)

    const actionButtons = wrapper.findAll('.fab-action-button')
    await actionButtons[0].trigger('click')
    expect(wrapper.emitted('add')).toEqual([[]])
    expect(wrapper.find('.fab-action-menu').exists()).toBe(false)

    await wrapper.find('button[title="添加"]').trigger('click')
    await nextTick()
    await wrapper.findAll('.fab-action-button')[1].trigger('click')
    expect(wrapper.emitted('add-category')).toEqual([[]])
    expect(wrapper.find('.fab-action-menu').exists()).toBe(false)
  })

  it('closes the action menu on outside clicks and hides the authenticated fab for guests', async () => {
    const wrapper = createWrapper()

    await wrapper.find('button[title="添加"]').trigger('click')
    await nextTick()
    expect(wrapper.find('.fab-action-menu').exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('.fab-action-menu').exists()).toBe(false)

    adminStoreMock.isAuthenticated = false
    const guestWrapper = createWrapper()

    expect(guestWrapper.find('.fab-menu-shell').exists()).toBe(false)
    expect(guestWrapper.find('button[title="菜单"]').exists()).toBe(true)
  })
})
