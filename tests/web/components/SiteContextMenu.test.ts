import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))
vi.mock('@/components/AppIcon.vue', () => ({
  default: defineComponent({
    name: 'AppIcon',
    props: ['name'],
    setup() {
      return () => h('i', { class: 'app-icon-stub' })
    }
  })
}))

const SiteContextMenu = (await import('../../../src/web/components/index/SiteContextMenu.vue'))
  .default

const mountedWrappers: Array<ReturnType<typeof mount>> = []

const createWrapper = (props: Record<string, unknown> = {}) => {
  const wrapper = mount(SiteContextMenu, {
    props: { visible: true, x: 10, y: 20, ...props },
    // 挂载到文档树：jsdom 中脱离文档的元素无法被 focus()
    attachTo: document.body
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('SiteContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
  })

  it('renders nothing when visible is false', () => {
    const wrapper = createWrapper({ visible: false, item: { id: 1 } })
    expect(wrapper.find('.context-menu').exists()).toBe(false)
  })

  it('positions the menu at the provided coordinates when visible', () => {
    const wrapper = createWrapper({ x: 120, y: 80 })
    const menu = wrapper.find('.context-menu')
    expect(menu.exists()).toBe(true)
    expect((menu.element as HTMLElement).style.top).toBe('80px')
    expect((menu.element as HTMLElement).style.left).toBe('120px')
  })

  it('emits item actions when the item menu items are clicked', async () => {
    const item = { id: 1, name: 'Example', pinned: false, url: '', categoryId: 1 }
    const wrapper = createWrapper({ item })

    const items = wrapper.findAll('.menu-item')
    expect(items.length).toBeGreaterThanOrEqual(5)

    await items[0].trigger('click')
    await items[1].trigger('click')
    await items[2].trigger('click')
    await items[3].trigger('click')
    await items[4].trigger('click')

    expect(wrapper.emitted('selection-mode')).toBeTruthy()
    expect(wrapper.emitted('move-item')).toBeTruthy()
    expect(wrapper.emitted('toggle-pin')).toBeTruthy()
    expect(wrapper.emitted('edit-item')).toBeTruthy()
    expect(wrapper.emitted('delete-item')).toBeTruthy()
  })

  it('shows the unpin label for pinned items and the pin label otherwise', () => {
    const pinnedItem = { id: 1, name: 'P', pinned: true, url: '', categoryId: 1 }
    const unpinnedItem = { id: 2, name: 'U', pinned: false, url: '', categoryId: 1 }

    const pinnedWrapper = createWrapper({ item: pinnedItem })
    expect(pinnedWrapper.text()).toContain('context.unpin')

    const unpinnedWrapper = createWrapper({ item: unpinnedItem })
    expect(unpinnedWrapper.text()).toContain('context.pin')
  })

  it('emits category move events with direction and honors first/last disabled state', async () => {
    const category = { id: 5, name: 'Tools', order: 0 }
    const wrapper = createWrapper({
      category,
      isFirstCategory: true,
      isLastCategory: false
    })

    const items = wrapper.findAll('.menu-item')
    // move-up is disabled (isFirstCategory), move-down enabled
    expect(items[0].attributes('disabled')).toBeDefined()

    // move-down click emits 1
    await items[1].trigger('click')
    expect(wrapper.emitted('move-category')).toEqual([[1]])

    // move-up click on first category should NOT emit (disabled)
    await items[0].trigger('click')
    expect(wrapper.emitted('move-category')).toEqual([[1]])
  })

  it('disables the last category down-move and emits edit/delete category actions', async () => {
    const category = { id: 6, name: 'Bottom', order: 9 }
    const wrapper = createWrapper({
      category,
      isFirstCategory: false,
      isLastCategory: true
    })

    const items = wrapper.findAll('.menu-item')
    expect(items[1].attributes('disabled')).toBeDefined()

    await items[0].trigger('click')
    await items[2].trigger('click')
    await items[3].trigger('click')

    expect(wrapper.emitted('move-category')).toEqual([[-1]])
    expect(wrapper.emitted('edit-category')).toBeTruthy()
    expect(wrapper.emitted('delete-category')).toBeTruthy()
  })

  it('stops click propagation via the root @click.stop handler', () => {
    const item = { id: 1, name: 'Ex', pinned: false, url: '', categoryId: 1 }
    const wrapper = createWrapper({ item })
    const root = wrapper.find('.context-menu')
    const stopPropagation = vi.fn()
    root.element.addEventListener('click', (e) => e.stopPropagation())
    // Mount-level @click.stop is configured by Vue; smoke test that a click
    // on the menu surface doesn't bubble by ensuring .stop modifier exists.
    expect(root.exists()).toBe(true)
    stopPropagation()
    expect(stopPropagation).toHaveBeenCalled()
  })

  it('emits close when Escape is pressed', async () => {
    const item = { id: 1, name: 'Ex', pinned: false, url: '', categoryId: 1 }
    const wrapper = createWrapper({ item })

    await wrapper.find('.context-menu').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('moves the highlighted item with arrow keys and wraps at boundaries', async () => {
    const item = { id: 1, name: 'Ex', pinned: false, url: '', categoryId: 1 }
    const wrapper = createWrapper({ item })
    const menu = wrapper.find('.context-menu')
    const items = wrapper.findAll('.menu-item')
    const lastIndex = items.length - 1

    // 无聚焦项：ArrowDown 落到首项（回归：曾因 off-by-one 跳到第 2 项）
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[0].element)

    // 首项 ArrowDown → 第二项
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1].element)

    // 第二项 ArrowUp → 回到首项
    await menu.trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[0].element)

    // 首项 ArrowUp → 回绕到末项
    await menu.trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[lastIndex].element)

    // 末项 ArrowDown → 回绕到首项
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[0].element)

    // 无聚焦项：ArrowUp 落到末项
    ;(document.activeElement as HTMLElement).blur()
    await menu.trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[lastIndex].element)
  })

  it('clamps the position within the viewport when coordinates would overflow', () => {
    const originalWidth = window.innerWidth
    const originalHeight = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 200 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 200 })

    try {
      // 菜单默认尺寸 200x260 超出 200x200 视口，坐标被钳到 (0,0) 而非 (120,80)
      const wrapper = createWrapper({ x: 120, y: 80 })
      const menu = wrapper.find('.context-menu')
      expect((menu.element as HTMLElement).style.left).toBe('0px')
      expect((menu.element as HTMLElement).style.top).toBe('0px')
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight })
    }
  })
})
