import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dataStoreMock: any = { deleteCategory: vi.fn() }
const adminApiMock = { uploadIconAsset: vi.fn() }
const feedbackMock = {
  ElMessage: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn() }
}

const flattenCategoryTreeMock = vi.fn((tree: Array<Record<string, any>>) => {
  const out: Array<{ label: string; value: number }> = []
  const walk = (nodes: Array<Record<string, any>>, prefix: string) => {
    for (const n of nodes) {
      out.push({ label: prefix + n.name, value: n.id })
      if (n.children?.length) walk(n.children, prefix + n.name + ' / ')
    }
  }
  walk(tree, '')
  return out
})
const readFileAsDataUrlMock = vi.fn(async () => 'data:image/png;base64,AAA')

vi.mock('@/store/data', () => ({ useDataStore: () => dataStoreMock }))
vi.mock('@/api/admin', () => ({ adminApi: adminApiMock }))
vi.mock('@/utils/feedback', () => feedbackMock)
vi.mock('@/components/AppSelect.vue', () => ({
  default: defineComponent({
    name: 'AppSelect',
    props: ['modelValue'],
    setup(_props, { slots }) {
      return () => h('select', { class: 'app-select-stub' }, slots.default?.())
    }
  })
}))
vi.mock('@/components/AppIcon.vue', () => ({
  default: defineComponent({
    name: 'AppIcon',
    props: ['name'],
    setup() {
      return () => h('i', { class: 'app-icon-stub' })
    }
  })
}))
vi.mock('@/utils/errors', () => ({ getErrorMessage: (_e: unknown, fallback: string) => fallback }))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))
vi.mock('../../../src/web/components/SiteDialog/form-utils', () => ({
  flattenCategoryTree: flattenCategoryTreeMock,
  readFileAsDataUrl: readFileAsDataUrlMock
}))

const CategoryForm = (await import('../../../src/web/components/SiteDialog/CategoryForm.vue'))
  .default

const mountedWrappers: Array<ReturnType<typeof mount>> = []

const createWrapper = (propsOverride: Record<string, unknown> = {}) => {
  const wrapper = mount(CategoryForm, {
    props: {
      modelValue: { name: 'Docs', level: 1 },
      categoryTree: [
        { id: 1, name: 'Docs', children: [] },
        { id: 2, name: 'Tools', children: [{ id: 3, name: 'CLI', children: [] }] }
      ],
      mode: 'category',
      categories: [{ id: 99, name: 'Sub', parentId: 1 }],
      ...propsOverride
    },
    attachTo: document.body
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('CategoryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dataStoreMock.deleteCategory = vi.fn().mockResolvedValue(undefined)
    adminApiMock.uploadIconAsset = vi.fn()
    feedbackMock.ElMessage.success.mockReset()
    feedbackMock.ElMessage.error.mockReset()
    feedbackMock.ElMessageBox.confirm.mockReset()
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
  })

  it('renders name and level fields and lets the name input receive values', async () => {
    const wrapper = createWrapper()
    const inputs = wrapper.findAll('input.dialog-input')
    expect(inputs.length).toBeGreaterThanOrEqual(1)

    await inputs[0].setValue('New Name')
    expect((inputs[0].element as HTMLInputElement).value).toBe('New Name')
  })

  it('flattens the category tree into parent options for subcategory mode', () => {
    createWrapper({ mode: 'subcategory' })
    expect(flattenCategoryTreeMock).toHaveBeenCalled()
    const labels = flattenCategoryTreeMock.mock.results[0]?.value ?? []
    expect(labels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 1 }),
        expect.objectContaining({ value: 3 })
      ])
    )
  })

  it('renders the parent AppSelect in subcategory mode', () => {
    const wrapper = createWrapper({ mode: 'subcategory' })
    expect(wrapper.find('select.app-select-stub').exists()).toBe(true)
  })

  it('lists sub-categories for the current category in category mode', () => {
    const wrapper = createWrapper({
      mode: 'category',
      modelValue: { id: 1, name: 'Docs', level: 1 }
    })
    const subs = wrapper.findAll('.sub-item')
    expect(subs).toHaveLength(1)
    expect(subs[0].text()).toContain('Sub')
  })

  it('emits addSubCategory and editSubCategory from the sub-category manager', async () => {
    const wrapper = createWrapper({
      mode: 'category',
      modelValue: { id: 1, name: 'Docs', level: 1 }
    })

    await wrapper.find('.sub-toolbar-button').trigger('click')
    expect(wrapper.emitted('addSubCategory')).toBeTruthy()

    await wrapper.find('.sub-icon-button:not(.danger)').trigger('click')
    expect(wrapper.emitted('editSubCategory')?.[0]?.[0]).toMatchObject({ id: 99 })
  })

  it('confirms and deletes a sub-category on the delete button', async () => {
    feedbackMock.ElMessageBox.confirm.mockResolvedValue(undefined)
    const wrapper = createWrapper({
      mode: 'category',
      modelValue: { id: 1, name: 'Docs', level: 1 }
    })

    await wrapper.find('.sub-icon-button.danger').trigger('click')
    await wrapper.vm.$nextTick()

    expect(dataStoreMock.deleteCategory).toHaveBeenCalledWith(99)
    expect(feedbackMock.ElMessage.success).toHaveBeenCalled()
  })

  it('skips deletion when the confirm dialog is cancelled', async () => {
    feedbackMock.ElMessageBox.confirm.mockRejectedValue(new Error('cancel'))
    const wrapper = createWrapper({
      mode: 'category',
      modelValue: { id: 1, name: 'Docs', level: 1 }
    })

    await wrapper.find('.sub-icon-button.danger').trigger('click')
    await wrapper.vm.$nextTick()

    expect(dataStoreMock.deleteCategory).not.toHaveBeenCalled()
  })

  it('uploads an icon file and assigns the returned URL on success', async () => {
    adminApiMock.uploadIconAsset.mockResolvedValue({ success: true, url: '/uploads/icon.png' })
    const wrapper = createWrapper()

    const fileInput = wrapper.find('input[type="file"]')
    const file = new File(['x'], 'icon.png', { type: 'image/png' })
    Object.defineProperty(fileInput.element, 'files', { value: [file] })
    Object.defineProperty(fileInput.element, 'value', { value: '', writable: true })
    await fileInput.trigger('change')

    expect(readFileAsDataUrlMock).toHaveBeenCalledWith(file)
    expect(adminApiMock.uploadIconAsset).toHaveBeenCalledWith('data:image/png;base64,AAA')
    expect(feedbackMock.ElMessage.success).toHaveBeenCalled()
  })

  it('surfaces an error message when the icon upload fails', async () => {
    adminApiMock.uploadIconAsset.mockResolvedValue({ success: false, error: 'too large' })
    const wrapper = createWrapper()

    const fileInput = wrapper.find('input[type="file"]')
    const file = new File(['x'], 'icon.png', { type: 'image/png' })
    Object.defineProperty(fileInput.element, 'files', { value: [file] })
    Object.defineProperty(fileInput.element, 'value', { value: '', writable: true })
    await fileInput.trigger('change')

    expect(feedbackMock.ElMessage.error).toHaveBeenCalledWith('too large')
  })

  it('handles thrown upload errors via the error utility fallback', async () => {
    adminApiMock.uploadIconAsset.mockRejectedValue(new Error('network'))
    const wrapper = createWrapper()

    const fileInput = wrapper.find('input[type="file"]')
    const file = new File(['x'], 'icon.png', { type: 'image/png' })
    Object.defineProperty(fileInput.element, 'files', { value: [file] })
    Object.defineProperty(fileInput.element, 'value', { value: '', writable: true })
    await fileInput.trigger('change')

    expect(feedbackMock.ElMessage.error).toHaveBeenCalled()
  })

  it('triggers the hidden file input when the upload button is clicked', async () => {
    const wrapper = createWrapper()
    const fileInput = wrapper.find('input[type="file"]').element as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {})

    await wrapper.find('.upload-button').trigger('click')
    expect(clickSpy).toHaveBeenCalled()
  })
})
