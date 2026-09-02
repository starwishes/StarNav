import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAppSelectValue, selectAppOption } from '../helpers/appSelect'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    warning: vi.fn()
  }
}))

const mountedWrappers: Array<ReturnType<typeof mount>> = []
const CategoryDialog = (await import('@/components/CategoryDialog.vue')).default

const createWrapper = (overrides: Record<string, unknown> = {}) => {
  const wrapper = mount(CategoryDialog, {
    props: {
      modelValue: true,
      form: {
        id: 1,
        name: 'Docs',
        level: 1
      },
      isEdit: false,
      ...overrides
    },
    global: {
      stubs: {
        teleport: true
      }
    }
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

describe('CategoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    document.body.innerHTML = ''
  })

  it('edits the local draft and emits the saved form payload', async () => {
    const wrapper = createWrapper()
    const inputs = wrapper.findAll('input')

    await inputs[0].setValue('9')
    await inputs[1].setValue('Renamed Category')
    await selectAppOption(wrapper.find('.dialog-select'), 2)
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('update:form')).toEqual([
      [
        {
          id: 9,
          name: 'Renamed Category',
          level: 2
        }
      ]
    ])
    expect(wrapper.emitted('save')).toEqual([[]])
  })

  it('closes from the close button, backdrop, and escape key', async () => {
    const wrapper = createWrapper()

    await wrapper.find('.dialog-close').trigger('click')
    await wrapper.find('.category-dialog-backdrop').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [false], [false]])
  })

  it('re-syncs a fresh draft when the dialog reopens with new props', async () => {
    const wrapper = createWrapper({
      form: {
        id: 1,
        name: 'Original',
        level: 0
      }
    })

    await wrapper.findAll('input')[1].setValue('Locally Edited')
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({
      form: {
        id: 2,
        name: 'Fresh Draft',
        level: 3
      },
      modelValue: true
    })
    await nextTick()

    const inputs = wrapper.findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('2')
    expect((inputs[1].element as HTMLInputElement).value).toBe('Fresh Draft')
    expect(getAppSelectValue(wrapper, '.dialog-select')).toBe('3')
  })

  it('blocks empty category names with aria-invalid on the name input', async () => {
    const wrapper = createWrapper({
      form: {
        id: 1,
        name: '',
        level: 0
      }
    })

    const nameInput = wrapper.findAll('input')[1]
    expect(nameInput.attributes('aria-invalid')).toBeUndefined()

    await wrapper.find('form').trigger('submit')

    expect(nameInput.attributes('aria-invalid')).toBe('true')
    expect(wrapper.emitted('save')).toBeUndefined()

    await nameInput.setValue('Docs')
    expect(nameInput.attributes('aria-invalid')).toBeUndefined()

    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toHaveLength(1)
  })
})
