import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, inject, nextTick, unref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let configStoreMock: any
let categoryTree: Array<Record<string, any>>
let findCategoryByIdMock: ReturnType<typeof vi.fn>
const mountedWrappers: Array<ReturnType<typeof mount>> = []

vi.mock('@/store/config', () => ({
  useConfigStore: () => configStoreMock
}))

vi.mock('@/composables/useSiteProjection', () => ({
  useSiteProjection: () => ({
    categoryTree,
    findCategoryById: findCategoryByIdMock
  })
}))

const SidebarItemStub = defineComponent({
  name: 'SidebarItem',
  props: ['category'],
  setup(props) {
    const expandedIds = inject<Set<number>>('expandedIds')
    const isSidebarCollapsed = inject('isSidebarCollapsed', false)
    const toggleExpand = inject<(id: number) => void>('toggleExpand')
    const selectCategory = inject<(id: number, tag: string | null) => void>('selectCategory')

    const expanded = computed(() => expandedIds?.has((props.category as any).id) ?? false)
    const collapsed = computed(() => Boolean(unref(isSidebarCollapsed)))

    return () =>
      h('li', { class: 'sidebar-item-stub' }, [
        h(
          'span',
          { class: `expanded-state-${String((props.category as any).id)}` },
          String(expanded.value)
        ),
        h(
          'span',
          { class: `collapsed-state-${String((props.category as any).id)}` },
          String(collapsed.value)
        ),
        h(
          'button',
          {
            class: `toggle-expand-${String((props.category as any).id)}`,
            onClick: () => toggleExpand?.((props.category as any).id)
          },
          'toggle'
        ),
        h(
          'button',
          {
            class: `select-category-${String((props.category as any).id)}`,
            onClick: () => selectCategory?.((props.category as any).id, null)
          },
          'select'
        ),
        (props.category as any)?.children?.[0]
          ? h(
              'button',
              {
                class: `select-child-category-${String((props.category as any).id)}`,
                onClick: () => selectCategory?.((props.category as any).children[0].id, null)
              },
              'select-child'
            )
          : null
      ])
  }
})

const CollapsibleSidebar = (await import('@/components/index/CollapsibleSidebar.vue')).default

const createWrapper = () => {
  const wrapper = mount(CollapsibleSidebar, {
    global: {
      stubs: {
        SidebarItem: SidebarItemStub
      }
    }
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

describe('CollapsibleSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configStoreMock = {
      displaySiteName: 'StarNav',
      siteConfig: {
        logoUrl: '/brand.svg'
      }
    }
    categoryTree = [
      {
        id: 1,
        name: 'Docs',
        children: [{ id: 2, name: 'API', children: [] }]
      }
    ]
    findCategoryByIdMock = vi.fn((categoryId: number) =>
      categoryId === 1 ? { id: 1, name: 'Docs' } : null
    )

    document.body.innerHTML = ''
    vi.stubGlobal('scroll', vi.fn())
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 200
    })
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts collapsed by default and expands via the exposed toggle, clearing expanded state on collapse', async () => {
    const wrapper = createWrapper()

    // Collapsed by default: logo still shows, branding text hidden.
    expect(wrapper.find('.site-logo').attributes('src')).toBe('/brand.svg')
    expect(wrapper.find('.site-logo').attributes('alt')).toBe('StarNav')
    expect(wrapper.find('.site-title').exists()).toBe(false)
    expect(wrapper.classes()).toContain('collapsed')
    expect(wrapper.find('.collapsed-state-1').text()).toBe('true')
    ;(wrapper.vm as { toggleSidebar: () => void }).toggleSidebar()
    await nextTick()

    expect(wrapper.classes()).not.toContain('collapsed')
    // 首次挂载会同步一次初始折叠状态，切换后再发出变化
    expect(wrapper.emitted('collapse-change')).toEqual([[true], [false]])
    expect(wrapper.find('.site-title').exists()).toBe(true)
    expect(wrapper.find('.site-title').text()).toBe('StarNav')
    expect(wrapper.find('.collapsed-state-1').text()).toBe('false')

    await wrapper.find('.toggle-expand-1').trigger('click')
    await nextTick()
    expect(wrapper.find('.expanded-state-1').text()).toBe('true')
    ;(wrapper.vm as { toggleSidebar: () => void }).toggleSidebar()
    await nextTick()

    expect(wrapper.classes()).toContain('collapsed')
    expect(wrapper.emitted('collapse-change')).toEqual([[true], [false], [true]])
    expect(wrapper.find('.site-title').exists()).toBe(false)
    expect(wrapper.find('.expanded-state-1').text()).toBe('false')
    expect(wrapper.find('.collapsed-state-1').text()).toBe('true')
  })

  it('emits filter events and scrolls to the projected category anchor', async () => {
    const anchor = document.createElement('div')
    anchor.id = 'site-anchor-1'
    anchor.getBoundingClientRect = () =>
      ({
        top: 320,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 320,
        toJSON: () => ({})
      }) as DOMRect
    document.body.appendChild(anchor)

    const wrapper = createWrapper()

    await wrapper.find('.select-category-1').trigger('click')

    expect(wrapper.emitted('filter')).toEqual([[1, null]])
    expect(window.scroll).toHaveBeenCalledWith({
      top: 440,
      behavior: 'smooth'
    })
  })

  it('scrolls child-category selections to the parent category anchor', async () => {
    categoryTree = [
      {
        id: 1,
        name: 'Docs',
        children: [{ id: 2, name: 'API', children: [] }]
      }
    ]

    const anchor = document.createElement('div')
    anchor.id = 'site-anchor-1'
    anchor.getBoundingClientRect = () =>
      ({
        top: 320,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 320,
        toJSON: () => ({})
      }) as DOMRect
    document.body.appendChild(anchor)

    const wrapper = createWrapper()

    await wrapper.find('.select-child-category-1').trigger('click')

    expect(wrapper.emitted('filter')).toEqual([[2, null]])
    expect(window.scroll).toHaveBeenLastCalledWith({
      top: 440,
      behavior: 'smooth'
    })
  })
})
