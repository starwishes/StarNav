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

  it('exposes the label prop as the combobox accessible name', () => {
    // 内容文本不计入 role=combobox 的 accName，label prop 必须渲染成 aria-label（第 22 轮审查）
    const wrapper = createWrapper(
      { label: 'Rows per page', modelValue: '' },
      '<option value="10">10</option>'
    )

    expect(wrapper.find('.app-select').attributes('aria-label')).toBe('Rows per page')
  })

  it('omits aria-label when neither label prop nor aria-label attribute is provided', () => {
    const wrapper = createWrapper({ modelValue: '' }, '<option value="1">One</option>')

    expect(wrapper.find('.app-select').attributes('aria-label')).toBeUndefined()
  })

  it('accepts a fallthrough aria-label attribute when label prop is absent', () => {
    const wrapper = createWrapper(
      { 'aria-label': 'Fallthrough label', modelValue: '' },
      '<option value="1">One</option>'
    )

    expect(wrapper.find('.app-select').attributes('aria-label')).toBe('Fallthrough label')
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

  it('keeps menu options out of the tab sequence (pure aria-activedescendant)', async () => {
    // 第 34 轮盲审 L3：菜单 Teleport 到 body 后，若选项可被 Tab 聚焦，焦点落入菜单即
    // 丢失方向键/Esc 处理（keydown 只绑 combobox root）。选项按钮必须 tabindex=-1，
    // 键盘焦点恒留 combobox，活动项经 aria-activedescendant 表达；鼠标点击不受影响。
    const wrapper = createWrapper(
      { modelValue: '' },
      '<option value="1">One</option><option value="2">Two</option>'
    )

    await wrapper.find('.app-select').trigger('click')
    const optionButtons = document.body.querySelectorAll(
      '.app-select__menu button.app-select__option'
    )
    expect(optionButtons.length).toBe(2)
    optionButtons.forEach((button) => {
      expect(button.getAttribute('tabindex')).toBe('-1')
    })

    // 键盘焦点在 combobox root 时菜单内导航仍可用（聚焦/高亮/选择链路不受影响）
    const activeOption = document.body.querySelector(
      '.app-select__menu button.app-select__option.is-active'
    )
    expect(activeOption?.getAttribute('data-option-value')).toBe('1')
    await wrapper.find('.app-select').trigger('keydown', { key: 'Enter' })
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['1'])
  })

  it('prevents mousedown on options from stealing focus from the combobox root (round 35 G4)', async () => {
    // 鼠标/触控按下会把焦点移到选项按钮，选中后菜单卸载 → 焦点落 body。
    // @mousedown.prevent 阻止该焦点转移（不影响 click 触发），焦点恒留 root。
    const wrapper = createWrapper({ modelValue: '' }, '<option value="1">One</option>')

    await wrapper.find('.app-select').trigger('click')
    const option = document.body.querySelector(
      '.app-select__menu button.app-select__option'
    ) as HTMLElement

    const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    option.dispatchEvent(mousedown)
    expect(mousedown.defaultPrevented).toBe(true)

    // 点击仍正常选中并关闭菜单
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['1'])
    expect(document.body.querySelector('.app-select__menu')).toBeNull()
  })
})
