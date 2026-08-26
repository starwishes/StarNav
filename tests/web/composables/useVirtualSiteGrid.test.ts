import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { useVirtualSiteGrid } = await import('../../../src/web/composables/useVirtualSiteGrid.ts')

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    ResizeObserverMock.instances.push(this)
  }
}

const makeHost = (count: number, forceFull = false) =>
  defineComponent({
    setup() {
      const items = ref(
        Array.from({ length: count }, (_, index) => ({ id: index, name: `item-${index}` }))
      )
      const forceFullRender = ref(forceFull)
      const { gridRef, virtualized, visibleItems, spacerStyle, measure } = useVirtualSiteGrid({
        items,
        forceFullRender
      })
      return () =>
        h('div', { ref: gridRef, class: 'grid-host' }, [
          h('span', { class: 'virtualized' }, String(virtualized.value)),
          h('span', { class: 'visible-count' }, String(visibleItems.value.length)),
          h('span', { class: 'spacer-top', style: { paddingTop: spacerStyle.value.paddingTop } }),
          h('button', { class: 're-measure', onClick: measure })
        ])
    }
  })

const mountedWrappers: Array<ReturnType<typeof mount>> = []

const mountHost = (count: number, forceFull = false) => {
  const wrapper = mount(makeHost(count, forceFull), {
    attachTo: document.body
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('useVirtualSiteGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ResizeObserverMock.instances = []
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    vi.unstubAllGlobals()
  })

  it('keeps small lists fully rendered', () => {
    const wrapper = mountHost(5)
    expect(wrapper.find('.virtualized').text()).toBe('false')
    expect(wrapper.find('.visible-count').text()).toBe('5')
    expect(wrapper.find('.spacer-top').attributes('style')).toContain('padding-top: 0px')
  })

  it('virtualizes large lists to a viewport slice', () => {
    const wrapper = mountHost(500)
    expect(wrapper.find('.virtualized').text()).toBe('true')
    const visible = Number(wrapper.find('.visible-count').text())
    expect(visible).toBeGreaterThan(0)
    expect(visible).toBeLessThan(500)
  })

  it('stays fully rendered when forceFullRender is enabled', () => {
    const wrapper = mountHost(500, true)
    expect(wrapper.find('.virtualized').text()).toBe('false')
    expect(wrapper.find('.visible-count').text()).toBe('500')
  })

  it('registers a resize observer and disconnects on unmount', async () => {
    const wrapper = mountHost(10)
    expect(ResizeObserverMock.instances.length).toBeGreaterThan(0)
    expect(ResizeObserverMock.instances[0].observe).toHaveBeenCalled()

    wrapper.unmount()
    await wrapper.vm.$nextTick()
    const instance = ResizeObserverMock.instances[0]
    expect(instance.disconnect).toHaveBeenCalled()
  })

  it('exposes a measure function that recalculates after scrolling', () => {
    const wrapper = mountHost(10)
    expect(wrapper.find('.re-measure').exists()).toBe(true)
    wrapper.find('.re-measure').trigger('click')
    expect(wrapper.find('.virtualized').text()).toBe('false')
  })
})
