import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let adminStoreMock: any
let api: ReturnType<typeof import('@/composables/useSiteMenu').useSiteMenu> | null = null

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

const { useSiteMenu } = await import('@/composables/useSiteMenu')

const Harness = defineComponent({
  name: 'UseSiteMenuHarness',
  setup() {
    api = useSiteMenu()
    return () => h('div', { class: 'site-menu-harness' })
  }
})

const mountedWrappers: Array<ReturnType<typeof mount>> = []

const mountHarness = () => {
  api = null
  const wrapper = mount(Harness)
  mountedWrappers.push(wrapper)
  return {
    wrapper,
    api: api!
  }
}

describe('useSiteMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminStoreMock = {
      isAuthenticated: true
    }
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
  })

  it('opens item and category context menus for authenticated admins', async () => {
    const { api } = mountHarness()
    const preventDefault = vi.fn()

    api.showContextMenu(
      {
        clientX: 18,
        clientY: 42,
        preventDefault
      } as unknown as MouseEvent,
      {
        id: 10,
        name: 'Docs',
        url: 'https://docs.test',
        description: '',
        categoryId: 1
      },
      2,
      3
    )

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(api.contextMenu).toMatchObject({
      visible: true,
      x: 18,
      y: 42,
      catIndex: 2,
      itemIndex: 3,
      item: expect.objectContaining({ id: 10 }),
      category: null
    })

    api.showCategoryContextMenu(
      {
        clientX: 6,
        clientY: 9,
        preventDefault
      } as unknown as MouseEvent,
      {
        id: 5,
        name: 'Tools'
      } as any,
      1
    )

    expect(api.contextMenu).toMatchObject({
      visible: true,
      x: 6,
      y: 9,
      catIndex: 1,
      item: null,
      category: expect.objectContaining({ id: 5 })
    })
  })

  it('ignores unauthenticated and virtual-category menu requests', () => {
    const unauth = mountHarness().api
    adminStoreMock.isAuthenticated = false

    unauth.showContextMenu(new MouseEvent('contextmenu'), {} as any, 0, 0)
    unauth.showCategoryContextMenu(new MouseEvent('contextmenu'), { id: 1, name: 'Docs' } as any, 0)
    expect(unauth.contextMenu.visible).toBe(false)

    adminStoreMock.isAuthenticated = true
    const { api } = mountHarness()
    api.showCategoryContextMenu(new MouseEvent('contextmenu'), { id: -1, name: 'Pinned' } as any, 0)
    expect(api.contextMenu.visible).toBe(false)
  })

  it('closes when the document is clicked and removes the listener on unmount', async () => {
    const { wrapper, api } = mountHarness()

    api.contextMenu.visible = true
    document.dispatchEvent(new MouseEvent('click'))
    await nextTick()
    expect(api.contextMenu.visible).toBe(false)

    api.contextMenu.visible = true
    wrapper.unmount()
    document.dispatchEvent(new MouseEvent('click'))
    await nextTick()
    expect(api.contextMenu.visible).toBe(true)
  })

  it('returns focus to the trigger element after a keyboard-opened menu closes', async () => {
    const { api } = mountHarness()
    const trigger = document.createElement('a')
    trigger.href = '#'
    document.body.appendChild(trigger)
    try {
      // 真实 dispatch 让 event.target 落在触发元素上（键盘事件没有 clientX/Y，
      // useSiteMenu 用触发元素矩形计算菜单位置并记录它用于归还焦点）
      const keyEvent = new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true })
      trigger.dispatchEvent(keyEvent)
      api.showContextMenu(keyEvent, { id: 10, name: 'Docs' } as any, 1, 2)

      expect(api.contextMenu.visible).toBe(true)
      expect(api.contextMenu.catIndex).toBe(1)

      // 模拟打开后焦点已移入菜单（SiteContextMenu 打开即聚焦首项），关闭须归还
      const fakeMenu = document.createElement('div')
      fakeMenu.className = 'context-menu'
      const menuItem = document.createElement('button')
      menuItem.className = 'menu-item'
      fakeMenu.appendChild(menuItem)
      document.body.appendChild(fakeMenu)
      menuItem.focus()

      api.closeContextMenu()
      expect(api.contextMenu.visible).toBe(false)
      expect(document.activeElement).toBe(trigger)
    } finally {
      document.body.removeChild(trigger)
      document.body.querySelector('.context-menu')?.remove()
    }
  })

  it('does not steal focus from an outside pointer click that focused another element', async () => {
    const { api } = mountHarness()
    const trigger = document.createElement('a')
    trigger.href = '#'
    document.body.appendChild(trigger)
    const elsewhere = document.createElement('button')
    elsewhere.id = 'elsewhere'
    document.body.appendChild(elsewhere)
    try {
      const mouseEvent = new MouseEvent('contextmenu', { bubbles: true })
      trigger.dispatchEvent(mouseEvent)
      api.showContextMenu(mouseEvent, { id: 1, name: 'Docs' } as any, 0, 0)

      // 外部指针点击已把焦点带到其他元素：关闭菜单不得抢回焦点
      elsewhere.focus()
      api.closeContextMenu()
      expect(api.contextMenu.visible).toBe(false)
      expect(document.activeElement).toBe(elsewhere)
    } finally {
      document.body.removeChild(trigger)
      document.body.removeChild(elsewhere)
    }
  })
})
