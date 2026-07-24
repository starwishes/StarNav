import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SearchBox = (await import('@/components/index/SearchBox.vue')).default

const createWrapper = (overrides: Record<string, unknown> = {}) =>
  mount(SearchBox, {
    props: {
      modelValue: 'star',
      searchMode: 'online',
      placeholder: 'Search here',
      ...overrides
    },
    slots: {
      'engine-selector': '<div class="engine-slot">slot</div>'
    },
    global: {
      stubs: {
        AppIcon: true
      }
    }
  })

describe('SearchBox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders slot content and forwards input/focus/blur/enter/clear events', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('input.search-input')

    expect(wrapper.find('.engine-slot').exists()).toBe(true)
    expect(input.attributes('placeholder')).toBe('Search here')

    await wrapper.find('.mode-btn').trigger('click')
    await input.setValue('updated')
    await input.trigger('focus')
    await input.trigger('blur')
    await input.trigger('keyup.enter')
    await wrapper.find('.clear-btn').trigger('click')

    expect(wrapper.emitted('update:searchMode')).toEqual([['local']])
    expect(wrapper.emitted('update:modelValue')).toEqual([['updated']])
    expect(wrapper.emitted('focus')).toHaveLength(1)
    expect(wrapper.emitted('blur')).toHaveLength(1)
    expect(wrapper.emitted('enter')).toHaveLength(1)
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('exposes focus() to focus the underlying input', async () => {
    const wrapper = createWrapper({
      modelValue: ''
    })
    const input = wrapper.find('input.search-input').element as HTMLInputElement
    const focusSpy = vi.spyOn(input, 'focus')

    ;(wrapper.vm as unknown as { focus: () => void }).focus()

    expect(focusSpy).toHaveBeenCalledTimes(1)
  })

  it('hides the clear button when there is no input value', () => {
    const wrapper = createWrapper({
      modelValue: ''
    })

    expect(wrapper.find('.clear-btn').exists()).toBe(false)
  })
})
