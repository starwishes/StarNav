import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let dataStoreMock: any

const mocks = vi.hoisted(() => ({
  messageSuccess: vi.fn(),
  confirm: vi.fn()
}))

vi.mock('@/store/data', () => ({
  useDataStore: () => dataStoreMock
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess
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

const { useContextMenuActions } = await import('@/composables/useContextMenuActions')

describe('useContextMenuActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dataStoreMock = {
      categories: [
        { id: 1, name: 'Docs' },
        { id: 2, name: 'Tools' },
        { id: 3, name: 'Admin' }
      ],
      updateItem: vi.fn().mockResolvedValue(undefined),
      moveCategory: vi.fn().mockResolvedValue(undefined),
      deleteItem: vi.fn().mockResolvedValue(undefined),
      deleteCategory: vi.fn().mockResolvedValue(undefined)
    }
  })

  it('toggles pin state and moves categories relative to their real index', async () => {
    const contextMenu = reactive({
      visible: true,
      x: 10,
      y: 20,
      item: {
        id: 7,
        pinned: false
      },
      category: {
        id: 2,
        name: 'Tools'
      },
      catIndex: 1,
      itemIndex: 0
    })
    const closeContextMenu = vi.fn()

    const composable = useContextMenuActions(contextMenu as any, closeContextMenu)
    await composable.togglePin()
    await composable.moveCategory(-1)

    expect(dataStoreMock.updateItem).toHaveBeenCalledWith({ id: 7, pinned: true })
    expect(dataStoreMock.moveCategory).toHaveBeenCalledWith(1, 0)
    expect(closeContextMenu).toHaveBeenCalledTimes(2)
    expect(composable.isFirstCategory.value).toBe(false)
    expect(composable.isLastCategory.value).toBe(false)
  })

  it('computes first and last category boundaries from the backing store order', () => {
    const firstMenu = reactive({
      visible: true,
      x: 0,
      y: 0,
      item: null,
      category: { id: 1, name: 'Docs' },
      catIndex: 0,
      itemIndex: -1
    })
    const lastMenu = reactive({
      visible: true,
      x: 0,
      y: 0,
      item: null,
      category: { id: 3, name: 'Admin' },
      catIndex: 2,
      itemIndex: -1
    })

    expect(useContextMenuActions(firstMenu as any, vi.fn()).isFirstCategory.value).toBe(true)
    expect(useContextMenuActions(lastMenu as any, vi.fn()).isLastCategory.value).toBe(true)
  })

  it('confirms item deletion and category deletion, then reports success', async () => {
    mocks.confirm.mockResolvedValue('confirm')

    const contextMenu = reactive({
      visible: true,
      x: 0,
      y: 0,
      item: { id: 8, pinned: true },
      category: { id: 3, name: 'Admin' },
      catIndex: 2,
      itemIndex: 0
    })
    const closeContextMenu = vi.fn()
    const composable = useContextMenuActions(contextMenu as any, closeContextMenu)

    await composable.handleDelete()
    await composable.handleDeleteCategory()

    expect(dataStoreMock.deleteItem).toHaveBeenCalledWith(8)
    expect(dataStoreMock.deleteCategory).toHaveBeenCalledWith(3)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:common.deleteSuccess')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:category.deleteSuccess')
  })

  it('ignores actions when the context menu does not target an item or category', async () => {
    const contextMenu = reactive({
      visible: false,
      x: 0,
      y: 0,
      item: null,
      category: null,
      catIndex: -1,
      itemIndex: -1
    })

    const composable = useContextMenuActions(contextMenu as any, vi.fn())
    await composable.togglePin()
    await composable.moveCategory(1)
    await composable.handleDeleteCategory()

    expect(dataStoreMock.updateItem).not.toHaveBeenCalled()
    expect(dataStoreMock.moveCategory).not.toHaveBeenCalled()
    expect(dataStoreMock.deleteCategory).not.toHaveBeenCalled()
  })
})
