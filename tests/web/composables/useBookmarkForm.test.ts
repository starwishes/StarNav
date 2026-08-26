import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dataStoreMock = {
  addCategory: vi.fn()
}
const adminApiMock = {
  uploadIconAsset: vi.fn()
}
const feedbackMock = {
  ElMessage: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() }
}
const readFileAsDataUrlMock = vi.fn(async () => 'data:image/png;base64,AAA')

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/store/data', () => ({ useDataStore: () => dataStoreMock }))
vi.mock('@/api/admin', () => ({ adminApi: adminApiMock }))
vi.mock('@/utils/feedback', () => feedbackMock)
vi.mock('@/utils/errors', () => ({ getErrorMessage: (_e: unknown, fb: string) => fb }))
vi.mock('@/components/SiteDialog/form-utils', () => ({
  readFileAsDataUrl: readFileAsDataUrlMock
}))

const { useBookmarkForm } = await import('../../../src/web/composables/useBookmarkForm.ts')

const tree = [
  {
    id: 1,
    name: 'Docs',
    label: 'Docs',
    children: [{ id: 10, name: 'API', label: 'API', children: [] }]
  },
  { id: 2, name: 'Tools', label: 'Tools', children: [] }
]

type FormDraft = { name: string; categoryId?: number }

const makeForm = (overrides: Partial<FormDraft> = {}) =>
  ref<FormDraft>({ name: '', categoryId: undefined, ...overrides })

describe('useBookmarkForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dataStoreMock.addCategory = vi.fn().mockResolvedValue({ id: 99 })
    adminApiMock.uploadIconAsset = vi.fn()
  })

  it('builds parent and child category options from the tree', () => {
    const formData = makeForm()
    const categoryTree = ref(tree)
    const { parentCategoryOptions, childCategoryOptions, selectedParentCategory } = useBookmarkForm(
      formData,
      categoryTree
    )

    expect(parentCategoryOptions.value).toEqual([
      { value: '1', label: 'Docs' },
      { value: '2', label: 'Tools' }
    ])

    formData.value.categoryId = 10
    expect(selectedParentCategory.value).toMatchObject({ id: 1 })
    expect(childCategoryOptions.value).toEqual([{ value: '10', label: 'API' }])
  })

  it('computes the selected parent and child ids from the form category', () => {
    const formData = makeForm({ categoryId: 10 })
    const categoryTree = ref(tree)
    const { selectedParentCategoryId, selectedChildCategoryId } = useBookmarkForm(
      formData,
      categoryTree
    )

    expect(selectedParentCategoryId.value).toBe('1')
    expect(selectedChildCategoryId.value).toBe('10')
  })

  it('clears the category when an invalid parent id is selected', () => {
    const formData = makeForm({ categoryId: 10 })
    const categoryTree = ref(tree)
    const { selectedParentCategoryId } = useBookmarkForm(formData, categoryTree)

    selectedParentCategoryId.value = '999'
    expect(formData.value.categoryId).toBeUndefined()
  })

  it('keeps the child category when selecting its parent', () => {
    const formData = makeForm({ categoryId: 10 })
    const categoryTree = ref(tree)
    const { selectedParentCategoryId } = useBookmarkForm(formData, categoryTree)

    selectedParentCategoryId.value = '1'
    expect(formData.value.categoryId).toBe(10)
  })

  it('toggles the inline add form and seeds the selected parent id', () => {
    const formData = makeForm({ categoryId: 10 })
    const categoryTree = ref(tree)
    const { showInlineAdd, toggleInlineAdd, closeInlineAdd, inlineCatForm } = useBookmarkForm(
      formData,
      categoryTree
    )

    toggleInlineAdd()
    expect(showInlineAdd.value).toBe(true)
    expect(inlineCatForm.value.parentId).toBe(1)

    closeInlineAdd()
    expect(showInlineAdd.value).toBe(false)
  })

  it('warns when saving an inline category without a name', async () => {
    const formData = makeForm()
    const categoryTree = ref(tree)
    const { handleSaveInlineCategory } = useBookmarkForm(formData, categoryTree)

    await handleSaveInlineCategory()

    expect(feedbackMock.ElMessage.warning).toHaveBeenCalled()
    expect(dataStoreMock.addCategory).not.toHaveBeenCalled()
  })

  it('saves the inline category and assigns its id to the form', async () => {
    const formData = makeForm()
    const categoryTree = ref(tree)
    const { inlineCatForm, handleSaveInlineCategory, showInlineAdd } = useBookmarkForm(
      formData,
      categoryTree
    )

    inlineCatForm.value.name = 'New'
    await handleSaveInlineCategory()

    expect(dataStoreMock.addCategory).toHaveBeenCalledWith(inlineCatForm.value)
    expect(formData.value.categoryId).toBe(99)
    expect(feedbackMock.ElMessage.success).toHaveBeenCalled()
    expect(showInlineAdd.value).toBe(false)
  })

  it('surfaces an error when the inline category save fails', async () => {
    dataStoreMock.addCategory.mockRejectedValue(new Error('boom'))
    const formData = ref({ name: 'X' })
    const categoryTree = ref(tree)
    const { inlineCatForm, handleSaveInlineCategory } = useBookmarkForm(formData, categoryTree)

    inlineCatForm.value.name = 'X'
    await handleSaveInlineCategory()

    expect(feedbackMock.ElMessage.error).toHaveBeenCalled()
  })

  it('uploads an icon and assigns the url on success', async () => {
    adminApiMock.uploadIconAsset.mockResolvedValue({ success: true, url: '/uploads/i.png' })
    const formData = ref({ name: '', icon: '' })
    const categoryTree = ref(tree)
    const { handleIconUpload } = useBookmarkForm(formData, categoryTree)

    const input = document.createElement('input')
    const file = new File(['x'], 'i.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file] })
    Object.defineProperty(input, 'value', { value: '', writable: true })

    await handleIconUpload({ target: input } as unknown as Event)

    expect(readFileAsDataUrlMock).toHaveBeenCalledWith(file)
    expect(formData.value.icon).toBe('/uploads/i.png')
    expect(feedbackMock.ElMessage.success).toHaveBeenCalled()
  })

  it('shows an error message when the icon upload fails', async () => {
    adminApiMock.uploadIconAsset.mockResolvedValue({ success: false, error: 'bad' })
    const formData = makeForm()
    const categoryTree = ref(tree)
    const { handleIconUpload } = useBookmarkForm(formData, categoryTree)

    const input = document.createElement('input')
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'i.png')] })
    Object.defineProperty(input, 'value', { value: '', writable: true })

    await handleIconUpload({ target: input } as unknown as Event)

    expect(feedbackMock.ElMessage.error).toHaveBeenCalledWith('bad')
  })

  it('returns early when no file is selected', async () => {
    const formData = makeForm()
    const categoryTree = ref(tree)
    const { handleIconUpload } = useBookmarkForm(formData, categoryTree)

    const input = document.createElement('input')
    Object.defineProperty(input, 'files', { value: [] })

    await handleIconUpload({ target: input } as unknown as Event)

    expect(readFileAsDataUrlMock).not.toHaveBeenCalled()
  })
})
