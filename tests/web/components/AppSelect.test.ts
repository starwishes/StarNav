import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mountedWrappers: Array<ReturnType<typeof mount>> = []

const AppSelect = (await import('../../../src/web/components/AppSelect.vue')).default

const createWrapper = (props: Record<string, unknown> = {}, slotHtml = '') =>
  mount(AppSelect, {
    props,
    slots: { default: slotHtml },
    attachTo: document.body
  })

const closeOpenMenus = () => {
  document.body.querySelectorAll('.app-select__menu').forEach((el) => el.remove())
}

describe('AppSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    closeOpenMenus()
  })

  it('renders the placeholder when no option matches the model value', () => {
    const wrapper = createWrapper(
      { placeholder: 'Pick one', modelValue: '' },
      '<option value="1">One</option><option value="2">Two</option>'
    )

    expect(wrapper.find('.app-select__label').text()).toBe('Pick one')
    expect(wrapper.find('.app-select__label').classes()).toContain('is-placeholder')
  })

  it('opens the menu on click and closes when clicking the root again', async () => {
    const wrapper = createWrapper(
      { modelValue: '' },
      '<option value="1">One</option><option value="2">Two</option>'
    )

    expect(wrapper.find('.app-select__menu').exists()).toBe(false)

    await wrapper.find('.app-select').trigger('click')
    expect(document.body.querySelectorAll('.app-select__menu').length).toBeGreaterThan(0)

    await wrapper.find('.app-select').trigger('click')
    expect(wrapper.find('.app-select').classes()).not.toContain('is-open')
  })

  it('emits update:modelValue and change when an option is clicked', async () => {
    const wrapper = createWrapper(
      { modelValue: '1' },
      '<option value="1">One</option><option value="2">Two</option>'
    )

    await wrapper.find('.app-select').trigger('click')
    const menu = document.body.querySelector('.app-select__menu') as HTMLElement
    const optionButtons = menu.querySelectorAll('button.app-select__option')
    expect(optionButtons.length).toBe(2)

    optionButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2'])
    expect(wrapper.emitted('change')?.[0]).toEqual(['2'])
  })

  it('does not emit when the same option is clicked again', async () => {
    const wrapper = createWrapper(
      { modelValue: '1' },
      '<option value="1">One</option><option value="2">Two</option>'
    )

    await wrapper.find('.app-select').trigger('click')
    const optionButtons = document.body
      .querySelector('.app-select__menu')!
      .querySelectorAll('button.app-select__option')

    optionButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('skips disabled options when navigating with ArrowDown', async () => {
    const wrapper = createWrapper(
      { modelValue: '' },
      '<option value="1">One</option><option disabled value="2">Two</option><option value="3">Three</option>'
    )

    const root = wrapper.find('.app-select')
    await root.trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()

    const menu = document.body.querySelector('.app-select__menu') as HTMLElement
    const activeOption = menu.querySelector('.app-select__option.is-active')
    expect(activeOption?.getAttribute('data-option-value')).toBe('1')
  })

  it('selects the highlighted option when Enter is pressed', async () => {
    const wrapper = createWrapper(
      { modelValue: '' },
      '<option value="1">One</option><option value="2">Two</option>'
    )

    await wrapper.find('.app-select').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    await wrapper.find('.app-select').trigger('keydown', { key: 'Enter' })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['1'])
  })

  it('closes the open menu when Escape is pressed', async () => {
    const wrapper = createWrapper({ modelValue: '' }, '<option value="1">One</option>')

    await wrapper.find('.app-select').trigger('click')
    await wrapper.find('.app-select').trigger('keydown', { key: 'Escape' })
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.app-select__menu')).toBeNull()
  })

  it('does not open when disabled', async () => {
    const wrapper = createWrapper(
      { disabled: true, modelValue: '' },
      '<option value="1">One</option>'
    )

    await wrapper.find('.app-select').trigger('click')
    expect(document.body.querySelector('.app-select__menu')).toBeNull()
    expect(wrapper.find('.app-select').classes()).toContain('is-disabled')
  })

  it('closes the menu when disabled becomes true', async () => {
    const wrapper = createWrapper(
      { disabled: false, modelValue: '' },
      '<option value="1">One</option>'
    )

    await wrapper.find('.app-select').trigger('click')
    expect(document.body.querySelector('.app-select__menu')).not.toBeNull()

    await wrapper.setProps({ disabled: true })
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.app-select__menu')).toBeNull()
  })

  it('closes the menu when a pointer-down event fires outside the component', async () => {
    const wrapper = createWrapper({ modelValue: '' }, '<option value="1">One</option>')

    await wrapper.find('.app-select').trigger('click')
    expect(document.body.querySelector('.app-select__menu')).not.toBeNull()

    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    document.body.removeChild(outside)
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.app-select__menu')).toBeNull()
  })

  it('opens the menu via ArrowUp when collapsed', async () => {
    const wrapper = createWrapper(
      { modelValue: '' },
      '<option value="1">One</option><option value="2">Two</option>'
    )

    await wrapper.find('.app-select').trigger('keydown', { key: 'ArrowUp' })
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.app-select__menu')).not.toBeNull()
  })
})
