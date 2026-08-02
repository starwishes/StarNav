import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  normalizeUrl: vi.fn((value: string) => value.trim()),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
  messageError: vi.fn(),
  alert: vi.fn()
}))

let dataStoreMock: any

vi.mock('@/store/data', () => ({
  useDataStore: () => dataStoreMock
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    warning: mocks.messageWarning,
    error: mocks.messageError
  },
  ElMessageBox: {
    alert: mocks.alert,
    confirm: vi.fn()
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

vi.mock('@common/url', () => ({
  normalizeUrl: mocks.normalizeUrl
}))

vi.mock('@common/constants', () => ({
  USER_LEVEL: {
    GUEST: 0,
    USER: 1,
    VIP: 2,
    ADMIN: 3
  }
}))

const BookmarkFormStub = defineComponent({
  name: 'BookmarkForm',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'bookmark-form-stub' }, [
        h('span', { class: 'bookmark-form-json' }, JSON.stringify(props.modelValue)),
        h(
          'button',
          {
            class: 'set-valid-bookmark',
            onClick: () =>
              emit('update:modelValue', {
                ...(props.modelValue as Record<string, unknown>),
                name: 'StarNav',
                url: ' https://star.test ',
                description: 'Navigation',
                categoryId: 7
              })
          },
          'set-valid'
        ),
        h(
          'button',
          {
            class: 'set-invalid-bookmark',
            onClick: () =>
              emit('update:modelValue', {
                ...(props.modelValue as Record<string, unknown>),
                name: 'Broken',
                url: 'invalid-url'
              })
          },
          'set-invalid'
        ),
        h(
          'button',
          {
            class: 'set-duplicate-bookmark',
            onClick: () =>
              emit('update:modelValue', {
                ...(props.modelValue as Record<string, unknown>),
                id: 12,
                name: 'Duplicate',
                url: 'https://dup.test',
                categoryId: 9
              })
          },
          'set-duplicate'
        )
      ])
  }
})

const CategoryFormStub = defineComponent({
  name: 'CategoryForm',
  props: ['modelValue', 'mode'],
  emits: ['update:modelValue', 'addSubCategory', 'editSubCategory'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'category-form-stub' }, [
        h('span', { class: 'category-mode' }, String(props.mode)),
        h('span', { class: 'category-form-json' }, JSON.stringify(props.modelValue)),
        h(
          'button',
          {
            class: 'set-category-name',
            onClick: () =>
              emit('update:modelValue', {
                ...(props.modelValue as Record<string, unknown>),
                name: 'Renamed Category'
              })
          },
          'rename'
        ),
        h(
          'button',
          { class: 'emit-add-sub-category', onClick: () => emit('addSubCategory') },
          'add-sub'
        ),
        h(
          'button',
          {
            class: 'emit-edit-sub-category',
            onClick: () =>
              emit('editSubCategory', {
                id: 31,
                name: 'Nested Child',
                parentId: 9,
                level: 1
              })
          },
          'edit-sub'
        )
      ])
  }
})

const SiteDialog = (await import('@/components/SiteDialog.vue')).default

const flushAsync = async () => {
  await flushPromises()
  await nextTick()
}

const createWrapper = (overrides: Record<string, unknown> = {}) =>
  mount(SiteDialog, {
    props: {
      modelValue: true,
      form: {},
      categoryForm: {},
      categories: [
        { id: 7, name: 'Docs', parentId: null, level: 0 },
        { id: 9, name: 'Tools', parentId: null, level: 0 },
        { id: 11, name: 'Nested', parentId: 9, level: 1 }
      ],
      isEdit: false,
      dialogMode: 'site',
      ...overrides
    },
    global: {
      stubs: {
        Teleport: true,
        BookmarkForm: BookmarkFormStub,
        CategoryForm: CategoryFormStub
      }
    }
  })

describe('SiteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dataStoreMock = {
      categories: [
        { id: 7, name: 'Docs', parentId: null, level: 0 },
        { id: 9, name: 'Tools', parentId: null, level: 0 },
        { id: 11, name: 'Nested', parentId: 9, level: 1 }
      ],
      addCategory: vi.fn().mockResolvedValue({ id: 21, name: 'Created Category' }),
      updateCategory: vi.fn().mockResolvedValue(undefined),
      findDuplicateItem: vi.fn().mockReturnValue(null)
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('validates bookmark drafts, normalizes urls, and emits saved payloads', async () => {
    const wrapper = createWrapper({
      form: {
        name: '',
        url: '',
        categoryId: 7
      }
    })
    await flushAsync()

    expect(wrapper.text()).toContain('translated:site.add')
    await wrapper.find('.footer-button.primary').trigger('click')
    expect(mocks.messageWarning).toHaveBeenCalledWith('translated:common.tips')

    await wrapper.find('.set-valid-bookmark').trigger('click')
    await flushAsync()
    await wrapper.find('.footer-button.primary').trigger('click')

    expect(mocks.normalizeUrl).toHaveBeenCalledWith(' https://star.test ')
    expect(wrapper.emitted('update:form')).toEqual([
      [
        {
          name: 'StarNav',
          url: 'https://star.test',
          description: 'Navigation',
          categoryId: 7
        }
      ]
    ])
    expect(wrapper.emitted('save')).toEqual([
      [
        {
          name: 'StarNav',
          url: 'https://star.test',
          description: 'Navigation',
          categoryId: 7
        }
      ]
    ])
  })

  it('blocks invalid and duplicate bookmark saves', async () => {
    const wrapper = createWrapper({
      form: {
        name: 'Initial',
        url: 'https://initial.test',
        categoryId: 7
      }
    })
    await flushAsync()

    mocks.normalizeUrl.mockReturnValueOnce('')
    await wrapper.find('.set-invalid-bookmark').trigger('click')
    await flushAsync()
    await wrapper.find('.footer-button.primary').trigger('click')

    expect(mocks.messageError).toHaveBeenCalledWith('translated:site.invalidUrl')
    expect(wrapper.emitted('save')).toBeUndefined()

    dataStoreMock.findDuplicateItem.mockReturnValueOnce({
      id: 99,
      name: 'Existing Bookmark',
      categoryId: 9
    })
    mocks.normalizeUrl.mockReturnValueOnce('https://dup.test')

    await wrapper.find('.set-duplicate-bookmark').trigger('click')
    await flushAsync()
    await wrapper.find('.footer-button.primary').trigger('click')

    expect(mocks.alert).toHaveBeenCalledWith(
      'translated:site.duplicateAlert',
      'translated:site.duplicateTitle',
      {
        confirmButtonText: 'translated:common.confirm',
        type: 'error'
      }
    )
  })

  it('updates existing categories and supports subcategory creation/edit flows', async () => {
    const wrapper = createWrapper({
      dialogMode: 'category',
      isEdit: true,
      categoryForm: {
        id: 9
      }
    })
    await flushAsync()

    expect(wrapper.text()).toContain('translated:category.editCategory')
    await wrapper.find('.set-category-name').trigger('click')
    await flushAsync()
    await wrapper.find('.footer-button.primary').trigger('click')
    await flushAsync()

    expect(dataStoreMock.updateCategory).toHaveBeenCalledWith({
      id: 9,
      name: 'Renamed Category',
      parentId: null,
      icon: '',
      level: 0
    })
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:category.updateSuccess')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])

    await wrapper.setProps({
      modelValue: true,
      isEdit: false,
      categoryForm: {
        id: 9
      }
    })
    await flushAsync()

    await wrapper.find('.emit-add-sub-category').trigger('click')
    await flushAsync()
    expect(wrapper.find('.category-mode').text()).toBe('subcategory')
    expect(wrapper.find('.category-form-json').text()).toContain('"parentId":9')

    await wrapper.find('.set-category-name').trigger('click')
    await flushAsync()
    await wrapper.find('.footer-button.primary').trigger('click')
    await flushAsync()

    expect(dataStoreMock.addCategory).toHaveBeenCalledWith({
      name: 'Renamed Category',
      parentId: 9,
      icon: '',
      level: 0
    })
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:category.addSuccess')

    await wrapper.setProps({
      modelValue: true,
      isEdit: false,
      categoryForm: {
        id: 9
      }
    })
    await flushAsync()

    await wrapper.find('.emit-edit-sub-category').trigger('click')
    await flushAsync()
    expect(wrapper.find('.category-mode').text()).toBe('subcategory')
    expect(wrapper.find('.category-form-json').text()).toContain('"id":31')
    expect(wrapper.find('.category-form-json').text()).toContain('"name":"Nested Child"')
  })

  it('closes from the close button and Escape key', async () => {
    const wrapper = createWrapper()
    await flushAsync()

    await wrapper.find('.site-dialog-close').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushAsync()

    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [false]])
  })
})
