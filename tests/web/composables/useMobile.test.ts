import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMobile } from '@/composables/useMobile'

const setInnerWidth = (value: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value
  })
}

const Harness = defineComponent({
  props: {
    breakpoint: {
      type: Number,
      default: 768
    }
  },
  setup(props) {
    return useMobile(props.breakpoint)
  },
  template: '<div>{{ isMobile }}</div>'
})

describe('useMobile', () => {
  beforeEach(() => {
    setInnerWidth(640)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('evaluates the initial viewport and updates on resize', async () => {
    const wrapper = mount(Harness, {
      props: {
        breakpoint: 768
      }
    })
    await nextTick()

    expect(wrapper.text()).toBe('true')

    setInnerWidth(1024)
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(wrapper.text()).toBe('false')

    setInnerWidth(768)
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(wrapper.text()).toBe('true')

    wrapper.unmount()
  })

  it('registers and cleans up the resize listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const wrapper = mount(Harness)

    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    wrapper.unmount()

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})
