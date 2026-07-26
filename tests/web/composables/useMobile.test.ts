import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMobile } from '@/composables/useMobile'

type MediaQueryListener = (event: MediaQueryListEvent) => void

const createMatchMedia = (initialMatches: boolean) => {
  const listeners = new Set<MediaQueryListener>()
  let matches = initialMatches

  const mediaQuery = {
    get matches() {
      return matches
    },
    media: '',
    onchange: null,
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (type === 'change') {
        listeners.add(listener as MediaQueryListener)
      }
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      if (type === 'change') {
        listeners.delete(listener as MediaQueryListener)
      }
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    setMatches(next: boolean) {
      matches = next
      const event = { matches: next } as MediaQueryListEvent
      for (const listener of listeners) {
        listener(event)
      }
    }
  }

  return mediaQuery
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
  let mediaQuery: ReturnType<typeof createMatchMedia>

  beforeEach(() => {
    mediaQuery = createMatchMedia(true)
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => {
        mediaQuery.media = query
        return mediaQuery
      })
    )
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('evaluates the initial viewport and updates on media change', async () => {
    const wrapper = mount(Harness, {
      props: {
        breakpoint: 768
      }
    })
    await nextTick()

    expect(wrapper.text()).toBe('true')
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)')

    mediaQuery.setMatches(false)
    await nextTick()
    expect(wrapper.text()).toBe('false')

    mediaQuery.setMatches(true)
    await nextTick()
    expect(wrapper.text()).toBe('true')

    wrapper.unmount()
  })

  it('registers and cleans up the media change listener', () => {
    const wrapper = mount(Harness)

    expect(mediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    wrapper.unmount()

    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
