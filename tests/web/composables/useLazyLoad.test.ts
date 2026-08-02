import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLazyLoad } from '@/composables/useLazyLoad'

describe('useLazyLoad', () => {
  let observeSpy: ReturnType<typeof vi.fn>
  let unobserveSpy: ReturnType<typeof vi.fn>
  let disconnectSpy: ReturnType<typeof vi.fn>
  let observerCallback: IntersectionObserverCallback
  let observerOptions: IntersectionObserverInit | undefined
  let instanceCount = 0

  class MockIntersectionObserver {
    root = null
    rootMargin = '0px'
    thresholds = [0.5]

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      observerCallback = callback
      observerOptions = options
      instanceCount += 1
    }

    observe = observeSpy
    unobserve = unobserveSpy
    disconnect = disconnectSpy

    takeRecords() {
      return []
    }
  }

  const Harness = defineComponent({
    setup() {
      return useLazyLoad('.lazy-image', {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
      })
    },
    template: `
      <div>
        <img class="lazy-image" data-src="/a.png">
        <img class="lazy-image" data-src="/b.png">
      </div>
    `
  })

  beforeEach(() => {
    observeSpy = vi.fn()
    unobserveSpy = vi.fn()
    disconnectSpy = vi.fn()
    observerCallback = () => {}
    observerOptions = undefined
    instanceCount = 0
    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver as unknown as typeof IntersectionObserver
    )
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('observes matching images on mount and loads intersecting entries', async () => {
    const wrapper = mount(Harness, {
      attachTo: document.body
    })
    await nextTick()
    const images = wrapper.findAll('img')
    const firstImage = images[0].element as HTMLImageElement

    expect(instanceCount).toBe(1)
    expect(observerOptions).toEqual({
      root: null,
      rootMargin: '0px',
      threshold: 0.5
    })
    expect(observeSpy).toHaveBeenCalledTimes(2)
    expect(observeSpy).toHaveBeenCalledWith(firstImage)

    observerCallback(
      [{ isIntersecting: true, target: firstImage } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver
    )

    expect(firstImage.getAttribute('src')).toBe('/a.png')
    expect(firstImage.hasAttribute('data-src')).toBe(false)
    expect(unobserveSpy).toHaveBeenCalledWith(firstImage)

    wrapper.unmount()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  it('reinitializes observation for newly inserted images', async () => {
    const wrapper = mount(Harness, {
      attachTo: document.body
    })
    await nextTick()
    const newImage = document.createElement('img')

    newImage.className = 'lazy-image'
    newImage.setAttribute('data-src', '/c.png')
    wrapper.element.appendChild(newImage)

    observeSpy.mockClear()
    ;(wrapper.vm as { reinit: () => void }).reinit()

    expect(instanceCount).toBe(2)
    expect(observeSpy).toHaveBeenCalledTimes(3)
    expect(observeSpy).toHaveBeenCalledWith(newImage)

    wrapper.unmount()
  })
})
