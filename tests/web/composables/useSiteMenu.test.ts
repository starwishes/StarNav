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
})
