import { nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type MockDataStore = ReturnType<typeof createStore>

let store: MockDataStore

const mocks = vi.hoisted(() => ({
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
  messageError: vi.fn(),
  confirm: vi.fn()
}))

const createStore = () => ({
  categories: ref([
    { id: 1, name: 'Docs' },
    { id: 2, name: 'Tools' }
  ]),
  items: ref([
    { id: 10, name: 'StarNav', url: 'https://star.test', description: '', categoryId: 1 },
    { id: 11, name: 'Utils', url: 'https://utils.test', description: '', categoryId: 2 }
  ]),
  loading: ref(false),
  loadData: vi.fn(),
  addCategory: vi.fn().mockResolvedValue(undefined),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  moveCategory: vi.fn().mockResolvedValue(undefined),
  addItem: vi.fn().mockResolvedValue(undefined),
  updateItem: vi.fn().mockResolvedValue(undefined),
  deleteItem: vi.fn().mockResolvedValue(undefined),
  batchDeleteItems: vi.fn().mockResolvedValue(undefined),
  batchMoveItems: vi.fn().mockResolvedValue(undefined)
})

vi.mock('@/store/data', () => ({
  useDataStore: () => store
}))

vi.mock('pinia', () => ({
  storeToRefs: (input: MockDataStore) => ({
    categories: input.categories,
    items: input.items,
    loading: input.loading
  })
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    warning: mocks.messageWarning,
    error: mocks.messageError
  },
  ElMessageBox: {
    confirm: mocks.confirm
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

const { useDataManagement } = await import('@/composables/admin/useDataManagement')

describe('useDataManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    store = createStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens the add-category dialog with a default draft', () => {
    const composable = useDataManagement()

    composable.handleAddCategory()

    expect(composable.isEdit.value).toBe(false)
    expect(composable.categoryDialogVisible.value).toBe(true)
    expect(composable.categoryForm.value).toEqual({ name: '', level: 0 })
  })

  it('validates and saves category drafts through the store', async () => {
    const composable = useDataManagement()

    await composable.saveCategory()
    expect(mocks.messageWarning).toHaveBeenCalledWith('translated:category.placeholderName')
    expect(store.addCategory).not.toHaveBeenCalled()

    composable.handleAddCategory()
    composable.categoryForm.value.name = 'Reading'
    await composable.saveCategory()

    expect(store.addCategory).toHaveBeenCalledWith({ name: 'Reading', level: 0 })
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:category.addSuccess')
    expect(composable.categoryDialogVisible.value).toBe(false)
  })

  it('saves edited categories and items through the update path', async () => {
    const composable = useDataManagement()

    composable.handleEditCategory({ id: 7, name: 'Old', level: 1 })
    composable.categoryForm.value.name = 'Updated'
    await composable.saveCategory()

    expect(store.updateCategory).toHaveBeenCalledWith({ id: 7, name: 'Updated', level: 1 })
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:category.updateSuccess')

    composable.handleEditItem({
      id: 20,
      name: 'Old Link',
      url: 'https://old.test',
      description: '',
      categoryId: 2
    })
    await composable.saveItem({
      id: 20,
      name: 'New Link',
      url: 'https://new.test',
      description: 'fresh',
      categoryId: 1
    })

    expect(store.updateItem).toHaveBeenCalledWith({
      id: 20,
      name: 'New Link',
      url: 'https://new.test/',
      description: 'fresh',
      categoryId: 1
    })
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:admin.updateSuccess')
    expect(composable.itemDialogVisible.value).toBe(false)
  })

  it('rejects unsafe bookmark urls in the data manager save path', async () => {
    const composable = useDataManagement()

    composable.handleAddItem()
    composable.itemForm.value.name = 'Evil'
    composable.itemForm.value.url = 'javascript:alert(1)'
    await composable.saveItem()

    expect(mocks.messageError).toHaveBeenCalledWith('translated:site.invalidUrl')
    expect(store.addItem).not.toHaveBeenCalled()

    composable.itemForm.value.url = 'https://good.test'
    await composable.saveItem()
    expect(store.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Evil', url: 'https://good.test/' })
    )
  })

  it('prevents concurrent bookmark saves while one is in flight', async () => {
    const composable = useDataManagement()
    composable.handleAddItem()
    composable.itemForm.value.name = 'Docs'
    composable.itemForm.value.url = 'https://docs.test'

    let resolveAdd: (value: unknown) => void = () => {}
    store.addItem.mockImplementation(() => new Promise((resolve) => (resolveAdd = resolve)))

    const first = composable.saveItem()
    const second = composable.saveItem()

    expect(store.addItem).toHaveBeenCalledTimes(1)

    resolveAdd(undefined)
    await first
    await second

    expect(mocks.messageSuccess).toHaveBeenCalledTimes(1)
  })

  it('opens the add-item dialog with category defaults and saves valid drafts', async () => {
    const composable = useDataManagement()

    composable.handleAddItem()
    expect(composable.isEdit.value).toBe(false)
    expect(composable.itemDialogVisible.value).toBe(true)
    expect(composable.itemForm.value).toEqual({
      name: '',
      url: '',
      description: '',
      categoryId: 1,
      pinned: false,
      level: 0
    })

    await composable.saveItem()
    expect(mocks.messageWarning).toHaveBeenCalledWith('translated:common.tips')
    expect(store.addItem).not.toHaveBeenCalled()

    composable.itemForm.value.name = 'Docs'
    composable.itemForm.value.url = 'https://docs.test'
    await composable.saveItem()

    expect(store.addItem).toHaveBeenCalledWith({
      name: 'Docs',
      url: 'https://docs.test/',
      description: '',
      categoryId: 1,
      pinned: false,
      level: 0
    })
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:admin.addSuccess')
  })

  it('confirms category deletion and skips the store call on cancellation', async () => {
    mocks.confirm.mockResolvedValue('confirm')

    const composable = useDataManagement()
    await composable.handleDeleteCategory({ id: 2, name: 'Tools' })

    expect(mocks.confirm).toHaveBeenCalledWith(
      'translated:category.deleteConfirm',
      'translated:common.delete',
      {
        type: 'warning'
      }
    )
    expect(store.deleteCategory).toHaveBeenCalledWith(2)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:category.deleteSuccess')

    vi.clearAllMocks()
    mocks.confirm.mockRejectedValue('cancel')

    await composable.handleDeleteCategory({ id: 1, name: 'Docs' })
    expect(store.deleteCategory).not.toHaveBeenCalled()
  })

  it('filters items by category and debounced keyword', async () => {
    vi.useFakeTimers()

    const composable = useDataManagement()
    composable.filterCategory.value = 1

    expect(composable.filteredItems.value.map((item) => item.id)).toEqual([10])

    composable.filterCategory.value = 0
    composable.searchKeyword.value = 'utils'
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(composable.filteredItems.value.map((item) => item.id)).toEqual([11])
  })

  it('delegates load and batch actions to the store', async () => {
    const composable = useDataManagement()

    await composable.loadData()
    await composable.handleBatchDelete([10, 11])
    await composable.handleBatchMove([10], 2)
    await composable.moveCategory(0, 'down')

    expect(store.loadData).toHaveBeenCalledTimes(1)
    expect(store.batchDeleteItems).toHaveBeenCalledWith([10, 11])
    expect(store.batchMoveItems).toHaveBeenCalledWith([10], 2)
    expect(store.moveCategory).toHaveBeenCalledWith(0, 1)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:table.deleteSuccess')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:table.moveSuccess')
  })
})
