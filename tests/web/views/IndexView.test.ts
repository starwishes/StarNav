import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, inject, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let configStoreMock: any
let toggleSidebarMock: ReturnType<typeof vi.fn>
let siteAddItemMock: ReturnType<typeof vi.fn>
let siteAddCategoryMock: ReturnType<typeof vi.fn>

vi.mock('@/store/config', () => ({
  useConfigStore: () => configStoreMock
}))

const BackgroundStub = defineComponent({
  name: 'Background',
  props: {
    visible: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    return () =>
      h('div', { class: 'background-stub' }, [
        h('span', { class: 'background-visible' }, String(props.visible))
      ])
  }
})

const PageHeaderStub = defineComponent({
  name: 'PageHeader',
  setup() {
    const toggleSidebar = inject<() => void>('toggleSidebar')
    return () =>
      h('div', { class: 'page-header-stub' }, [
        h('button', { class: 'emit-toggle-sidebar', onClick: () => toggleSidebar?.() }, 'toggle')
      ])
  }
})

const SearchStub = defineComponent({
  name: 'SearchViewStub',
  emits: ['overlay-active-change'],
  setup(_props, { emit }) {
    return () =>
      h('div', { class: 'search-stub' }, [
        h(
          'button',
          { class: 'emit-search-overlay-on', onClick: () => emit('overlay-active-change', true) },
          'overlay-on'
        ),
        h(
          'button',
          { class: 'emit-search-overlay-off', onClick: () => emit('overlay-active-change', false) },
          'overlay-off'
        )
      ])
  }
})

const SiteStub = defineComponent({
  name: 'Site',
  props: ['selectedCategoryId'],
  emits: ['loaded'],
  setup(_props, { emit, expose }) {
    expose({
      handleAddItem: siteAddItemMock,
      handleAddCategory: siteAddCategoryMock
    })

    return () =>
      h('div', { class: 'site-stub' }, [
        h('span', { class: 'selected-category-id' }, String((_props as any).selectedCategoryId)),
        h('button', { class: 'emit-site-loaded', onClick: () => emit('loaded') }, 'loaded')
      ])
  }
})

const FooterStub = defineComponent({
  name: 'FooterViewStub',
  setup() {
    return () => h('div', { class: 'footer-stub' }, 'footer')
  }
})

const SidebarStub = defineComponent({
  name: 'Sidebar',
  emits: ['add', 'add-category'],
  setup(_props, { emit }) {
    return () =>
      h('div', { class: 'sidebar-stub' }, [
        h('button', { class: 'emit-sidebar-add', onClick: () => emit('add') }, 'add'),
        h(
          'button',
          { class: 'emit-sidebar-add-category', onClick: () => emit('add-category') },
          'add-category'
        )
      ])
  }
})

const CollapsibleSidebarStub = defineComponent({
  name: 'CollapsibleSidebar',
  emits: ['collapse-change', 'filter'],
  setup(_props, { emit, expose }) {
    expose({
      toggleSidebar: toggleSidebarMock
    })

    return () =>
      h('div', { class: 'collapsible-sidebar-stub' }, [
        h(
          'button',
          { class: 'emit-collapse-change', onClick: () => emit('collapse-change', true) },
          'collapse'
        ),
        h('button', { class: 'emit-filter', onClick: () => emit('filter', 12, null) }, 'filter')
      ])
  }
})

const IndexView = (await import('@/views/Index/index.vue')).default

const flushAsync = async () => {
  await flushPromises()
  await nextTick()
}

const createWrapper = () =>
  mount(IndexView, {
    global: {
      stubs: {
        Background: BackgroundStub,
        PageHeader: PageHeaderStub,
        Search: SearchStub,
        Site: SiteStub,
        Sidebar: SidebarStub,
        Footer: FooterStub,
        CollapsibleSidebar: CollapsibleSidebarStub
      }
    }
  })

describe('Index view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    toggleSidebarMock = vi.fn()
    siteAddItemMock = vi.fn()
    siteAddCategoryMock = vi.fn()

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    configStoreMock = {
      ensureLoaded: vi.fn().mockResolvedValue(undefined)
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('waits for shared config load on mount and becomes ready after site + settings settle', async () => {
    const wrapper = createWrapper()
    await flushAsync()

    expect(configStoreMock.ensureLoaded).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.content').classes()).not.toContain('is-ready')
    expect(wrapper.find('.background-visible').text()).toBe('false')

    await wrapper.find('.emit-site-loaded').trigger('click')
    await flushAsync()
    vi.advanceTimersByTime(200)
    await flushAsync()

    expect(wrapper.find('.content').classes()).toContain('is-ready')
    expect(wrapper.find('.background-visible').text()).toBe('true')
  })

  it('wires provided toggleSidebar, collapse state, and site actions through the shell', async () => {
    const wrapper = createWrapper()
    await flushAsync()

    await wrapper.find('.emit-toggle-sidebar').trigger('click')
    await wrapper.find('.emit-collapse-change').trigger('click')
    await wrapper.find('.emit-filter').trigger('click')
    await flushAsync()

    expect(toggleSidebarMock).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.content').classes()).toContain('sidebar-collapsed')
    expect(wrapper.find('.selected-category-id').text()).toBe('12')

    await wrapper.find('.emit-sidebar-add').trigger('click')
    await wrapper.find('.emit-sidebar-add-category').trigger('click')

    expect(siteAddItemMock).toHaveBeenCalledTimes(1)
    expect(siteAddCategoryMock).toHaveBeenCalledTimes(1)
  })

  it('raises the hero stage above site content while search overlay is active', async () => {
    const wrapper = createWrapper()
    await flushAsync()

    expect(wrapper.find('.content').classes()).not.toContain('search-overlay-active')

    await wrapper.find('.emit-search-overlay-on').trigger('click')
    await flushAsync()

    expect(wrapper.find('.content').classes()).toContain('search-overlay-active')

    await wrapper.find('.emit-search-overlay-off').trigger('click')
    await flushAsync()

    expect(wrapper.find('.content').classes()).not.toContain('search-overlay-active')
  })

  it('still becomes ready when config loading fails', async () => {
    configStoreMock.ensureLoaded.mockRejectedValueOnce(new Error('config failed'))

    const wrapper = createWrapper()
    await flushAsync()
    await wrapper.find('.emit-site-loaded').trigger('click')
    await flushAsync()
    vi.advanceTimersByTime(200)
    await flushAsync()

    expect(console.error).toHaveBeenCalled()
    expect(wrapper.find('.content').classes()).toContain('is-ready')
  })
})
