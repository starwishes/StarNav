import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getContent: vi.fn(),
  saveContent: vi.fn(),
  addCategory: vi.fn(),
  updateCategory: vi.fn(),
  reorderCategories: vi.fn(),
  deleteCategory: vi.fn(),
  addItem: vi.fn(),
  updateItem: vi.fn(),
  moveItem: vi.fn(),
  batchMoveItems: vi.fn(),
  batchDeleteItems: vi.fn(),
  deleteItem: vi.fn(),
  messageError: vi.fn()
}))

vi.mock('@/api', () => ({
  dataApi: {
    getContent: mocks.getContent,
    saveContent: mocks.saveContent,
    addCategory: mocks.addCategory,
    updateCategory: mocks.updateCategory,
    reorderCategories: mocks.reorderCategories,
    deleteCategory: mocks.deleteCategory,
    addItem: mocks.addItem,
    updateItem: mocks.updateItem,
    moveItem: mocks.moveItem,
    batchMoveItems: mocks.batchMoveItems,
    batchDeleteItems: mocks.batchDeleteItems,
    deleteItem: mocks.deleteItem
  }
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    error: mocks.messageError,
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}))

const { useDataStore } = await import('@/store/data')

describe('data store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads and sanitizes content from the API payload', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [{ id: '1', name: 'Dev', level: '2', parentId: null }],
      items: [
        {
          id: '10',
          name: 'GitHub',
          url: 'https://github.com',
          categoryId: '1',
          pinned: 1,
          level: '2'
        }
      ]
    })

    const store = useDataStore()
    await store.loadData()

    expect(store.initialized).toBe(true)
    expect(store.categories).toEqual([
      {
        id: 1,
        name: 'Dev',
        level: 2,
        parentId: null
      }
    ])
    expect(store.items).toEqual([
      expect.objectContaining({
        id: 10,
        name: 'GitHub',
        categoryId: 1,
        pinned: true,
        level: 2
      })
    ])
  })

  it('appends normalized categories returned by the fine-grained category API', async () => {
    mocks.addCategory.mockResolvedValue({
      id: '5',
      name: 'New Category',
      icon: 'icon-folder',
      level: '1',
      parentId: '3'
    })

    const store = useDataStore()
    const createdCategory = await store.addCategory({ name: 'New Category', parentId: 3 })

    expect(mocks.addCategory).toHaveBeenCalledWith({ name: 'New Category', parentId: 3 })
    expect(createdCategory).toEqual({
      id: 5,
      name: 'New Category',
      icon: 'icon-folder',
      level: 1,
      parentId: 3
    })
    expect(store.categories).toEqual([createdCategory])
    expect(mocks.saveContent).not.toHaveBeenCalled()
  })

  it('removes deleted categories locally and migrates children and items to the parent', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [
        { id: 1, name: 'Root', parentId: null },
        { id: 2, name: 'Child', parentId: 1 },
        { id: 3, name: 'Grandchild', parentId: 2 }
      ],
      items: [
        { id: 10, name: 'Moved', url: 'https://moved.test', categoryId: 2 },
        { id: 11, name: 'Kept', url: 'https://kept.test', categoryId: 3 }
      ]
    })
    mocks.deleteCategory.mockResolvedValue({ success: true })

    const store = useDataStore()
    await store.loadData()
    await store.deleteCategory(2)

    expect(mocks.deleteCategory).toHaveBeenCalledWith(2)
    expect(store.categories).toEqual([
      expect.objectContaining({ id: 1, parentId: null }),
      expect.objectContaining({ id: 3, parentId: 1 })
    ])
    expect(store.items.find((item) => item.id === 10)?.categoryId).toBe(1)
    expect(store.items.find((item) => item.id === 11)?.categoryId).toBe(3)
    expect(mocks.saveContent).not.toHaveBeenCalled()
  })

  it('appends moved items to the end of the target category after an update', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [
        { id: 1, name: 'Source', parentId: null },
        { id: 2, name: 'Target', parentId: null }
      ],
      items: [
        { id: 1, name: 'Move Me', url: 'https://move-me.test', categoryId: 1 },
        { id: 2, name: 'Target A', url: 'https://target-a.test', categoryId: 2 },
        { id: 3, name: 'Target B', url: 'https://target-b.test', categoryId: 2 }
      ]
    })
    mocks.updateItem.mockResolvedValue({
      id: 1,
      name: 'Move Me',
      url: 'https://move-me.test',
      categoryId: 2
    })

    const store = useDataStore()
    await store.loadData()
    await store.updateItem({ id: 1, categoryId: 2 })

    expect(mocks.updateItem).toHaveBeenCalledWith(1, { id: 1, categoryId: 2 })
    expect(store.items.map((item) => item.id)).toEqual([2, 3, 1])
    expect(store.items[2]).toEqual(
      expect.objectContaining({
        id: 1,
        categoryId: 2
      })
    )
    expect(mocks.saveContent).not.toHaveBeenCalled()
  })

  it('batches item moves through the incremental batch move endpoint', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [{ id: 9, name: 'Target', parentId: null }],
      items: [
        { id: 1, name: 'One', url: 'https://one.test', categoryId: 1 },
        { id: 2, name: 'Two', url: 'https://two.test', categoryId: 1 }
      ]
    })
    mocks.batchMoveItems.mockResolvedValue([
      { id: 1, categoryId: 9 },
      { id: 2, categoryId: 9 }
    ])

    const store = useDataStore()
    await store.loadData()
    await store.batchMoveItems([1, 2], 9)

    expect(store.items).toEqual([
      expect.objectContaining({ id: 1, categoryId: 9 }),
      expect.objectContaining({ id: 2, categoryId: 9 })
    ])
    expect(mocks.updateItem).not.toHaveBeenCalled()
    expect(mocks.deleteItem).not.toHaveBeenCalled()
    expect(mocks.batchMoveItems).toHaveBeenCalledWith([1, 2], 9)
    expect(mocks.saveContent).not.toHaveBeenCalled()
  })

  it('batches item deletes through the incremental batch delete endpoint', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [{ id: 1, name: 'Target', parentId: null }],
      items: [
        { id: 1, name: 'One', url: 'https://one.test', categoryId: 1 },
        { id: 2, name: 'Two', url: 'https://two.test', categoryId: 1 }
      ]
    })
    mocks.batchDeleteItems.mockResolvedValue(2)

    const store = useDataStore()
    await store.loadData()
    await store.batchDeleteItems([1, 2])

    expect(store.items).toEqual([])
    expect(mocks.updateItem).not.toHaveBeenCalled()
    expect(mocks.deleteItem).not.toHaveBeenCalled()
    expect(mocks.batchDeleteItems).toHaveBeenCalledWith([1, 2])
    expect(mocks.saveContent).not.toHaveBeenCalled()
  })

  it('reports load failures and resets the loading flag', async () => {
    mocks.getContent.mockRejectedValueOnce(new Error('network down'))

    const store = useDataStore()
    await store.loadData()

    expect(store.loading).toBe(false)
    expect(store.initialized).toBe(false)
    // 第 16 轮审查：UI 只显示固定文案，原始 error.message 不直接上屏（原文进 logger）
    expect(mocks.messageError).toHaveBeenCalledWith('加载失败')
    expect(store.loadError).toBe('加载失败')
  })

  it('dedupes concurrent loadData callers into one request', async () => {
    let resolveContent: (value: { categories: unknown[]; items: unknown[] }) => void = () => {}
    mocks.getContent.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveContent = resolve
      })
    )

    const store = useDataStore()
    const first = store.loadData()
    const second = store.loadData()

    expect(mocks.getContent).toHaveBeenCalledTimes(1)

    resolveContent({ categories: [], items: [] })
    await Promise.all([first, second])

    expect(store.initialized).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('rolls category order back when optimistic move sync fails', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [
        { id: 1, name: 'One', parentId: null },
        { id: 2, name: 'Two', parentId: null },
        { id: 3, name: 'Three', parentId: null }
      ],
      items: []
    })
    mocks.reorderCategories.mockRejectedValueOnce(new Error('sync failed'))

    const store = useDataStore()
    await store.loadData()

    await expect(store.moveCategory(0, 2)).rejects.toThrow('sync failed')

    expect(store.categories.map((category) => category.id)).toEqual([1, 2, 3])
    expect(mocks.reorderCategories).toHaveBeenCalledWith([2, 3, 1])
    expect(store.saving).toBe(false)
    expect(mocks.messageError).toHaveBeenCalledWith('sync failed')
  })

  it('syncs moved items with the incremental move endpoint and can find duplicates by url', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [
        { id: 1, name: 'Source', parentId: null },
        { id: 2, name: 'Target', parentId: null }
      ],
      items: [
        { id: 10, name: 'First', url: 'https://dup.test', description: '', categoryId: 1 },
        { id: 11, name: 'Second', url: 'https://target-a.test', description: '', categoryId: 2 },
        { id: 12, name: 'Third', url: 'https://target-b.test', description: '', categoryId: 2 }
      ]
    })
    mocks.moveItem.mockResolvedValue({
      id: 10,
      name: 'First',
      url: 'https://dup.test',
      categoryId: 2
    })

    const store = useDataStore()
    await store.loadData()
    await store.moveItem(10, 2, 1)

    expect(store.items.map((item) => item.id)).toEqual([11, 10, 12])
    expect(mocks.moveItem).toHaveBeenCalledWith(10, { categoryId: 2, targetIndex: 1 })
    expect(store.findDuplicateItem('  HTTPS://dup.test  ')).toEqual(
      expect.objectContaining({ id: 10 })
    )
    expect(store.findDuplicateItem('https://dup.test', 10)).toBeNull()
  })

  it('rolls moved items back when optimistic sync fails', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [
        { id: 1, name: 'Source', parentId: null },
        { id: 2, name: 'Target', parentId: null }
      ],
      items: [
        { id: 10, name: 'First', url: 'https://first.test', description: '', categoryId: 1 },
        { id: 11, name: 'Second', url: 'https://second.test', description: '', categoryId: 2 }
      ]
    })
    mocks.moveItem.mockRejectedValueOnce(new Error('sync failed'))

    const store = useDataStore()
    await store.loadData()

    await expect(store.moveItem(10, 2, 1)).rejects.toThrow('sync failed')

    expect(store.items.map((item) => item.id)).toEqual([10, 11])
    expect(mocks.messageError).toHaveBeenCalledWith('sync failed')
  })

  it('rolls back batch item mutations when the bulk sync fails', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [
        { id: 1, name: 'Source', parentId: null },
        { id: 2, name: 'Target', parentId: null }
      ],
      items: [
        { id: 10, name: 'First', url: 'https://first.test', description: '', categoryId: 1 },
        { id: 11, name: 'Second', url: 'https://second.test', description: '', categoryId: 1 }
      ]
    })
    mocks.batchMoveItems.mockRejectedValueOnce(new Error('sync failed'))

    const store = useDataStore()
    await store.loadData()

    await expect(store.batchMoveItems([10, 11], 2)).rejects.toThrow('sync failed')
    expect(store.items.map((item) => item.categoryId)).toEqual([1, 1])

    mocks.batchDeleteItems.mockRejectedValueOnce(new Error('delete failed'))

    await expect(store.batchDeleteItems([10, 11])).rejects.toThrow('delete failed')
    expect(store.items.map((item) => item.id)).toEqual([10, 11])
  })

  it('skips loadData refreshes while a local save is in flight', async () => {
    let resolveAdd!: (value: unknown) => void
    mocks.addCategory.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAdd = resolve
      })
    )

    const store = useDataStore()
    const addPromise = store.addCategory({ name: 'Pending' })

    await store.loadData()
    expect(mocks.getContent).not.toHaveBeenCalled()

    resolveAdd({ id: 1, name: 'Pending' })
    await addPromise
    expect(store.saving).toBe(false)
  })

  it('does not apply a stale snapshot that resolves while a save is in flight', async () => {
    let resolveContent!: (value: unknown) => void
    let resolveAdd!: (value: unknown) => void
    mocks.getContent.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveContent = resolve
      })
    )
    mocks.addCategory.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAdd = resolve
      })
    )

    const store = useDataStore()
    const loadPromise = store.loadData()
    const addPromise = store.addCategory({ name: 'Optimistic' })

    // The load resolves while the mutation is still in flight — its snapshot is stale.
    resolveContent({
      categories: [{ id: 99, name: 'Stale Snapshot', parentId: null }],
      items: []
    })
    await loadPromise

    expect(store.categories).toEqual([])
    expect(store.initialized).toBe(false)

    resolveAdd({ id: 1, name: 'Optimistic' })
    await addPromise
    expect(store.categories.map((category) => category.id)).toEqual([1])
  })

  it('keeps saving true while any concurrent mutation is still in flight', async () => {
    mocks.getContent.mockResolvedValue({ categories: [], items: [] })
    let resolveAdd!: (value: unknown) => void
    mocks.addCategory.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAdd = resolve
      })
    )
    mocks.deleteItem.mockResolvedValueOnce({ success: true })

    const store = useDataStore()
    await store.loadData()

    const addPromise = store.addCategory({ name: 'Slow' })
    await store.deleteItem(999)
    expect(store.saving).toBe(true)

    resolveAdd({ id: 1, name: 'Slow' })
    await addPromise
    expect(store.saving).toBe(false)
  })

  it('ignores moveCategory when fromIndex is out of range or unchanged', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [
        { id: 1, name: 'One', parentId: null },
        { id: 2, name: 'Two', parentId: null }
      ],
      items: []
    })
    const store = useDataStore()
    await store.loadData()

    await store.moveCategory(5, 0)
    await store.moveCategory(-1, 1)
    await store.moveCategory(1, 1)

    expect(mocks.reorderCategories).not.toHaveBeenCalled()
    expect(store.categories.map((category) => category.id)).toEqual([1, 2])
  })

  it('syncs the full content tree through saveContent', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [{ id: 1, name: 'Root', parentId: null }],
      items: [{ id: 10, name: 'A', url: 'https://a.test', description: '', categoryId: 1 }]
    })
    mocks.saveContent.mockResolvedValue({ success: true })

    const store = useDataStore()
    await store.loadData()
    await store.saveData('import')

    expect(mocks.saveContent).toHaveBeenCalledTimes(1)
    expect(mocks.saveContent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'import',
        categories: [expect.objectContaining({ id: 1, name: 'Root', parentId: null })]
      })
    )
    expect(store.saving).toBe(false)
  })

  it('surfaces full-content sync failures as an error toast and rethrows', async () => {
    mocks.saveContent.mockRejectedValueOnce(new Error('sync boom'))

    const store = useDataStore()
    await expect(store.saveData('import')).rejects.toThrow('sync boom')
    expect(mocks.messageError).toHaveBeenCalledWith('sync boom')
    expect(store.saving).toBe(false)
  })

  it('patches click statistics into the local item and guards missing targets', async () => {
    mocks.getContent.mockResolvedValue({
      categories: [{ id: 1, name: 'Root', parentId: null }],
      items: [{ id: 10, name: 'A', url: 'https://a.test', description: '', categoryId: 1 }]
    })

    const store = useDataStore()
    await store.loadData()

    store.patchItemClick(10, 7, '2026-04-13T10:00:00.000Z')
    expect(store.items[0].clickCount).toBe(7)
    expect(store.items[0].lastVisited).toBe('2026-04-13T10:00:00.000Z')

    // tracked == null guard: missing target is a no-op
    store.patchItemClick(999, 1, null)
    expect(store.items).toHaveLength(1)

    // null lastVisited keeps the previous value
    store.patchItemClick(10, 8, null)
    expect(store.items[0].clickCount).toBe(8)
    expect(store.items[0].lastVisited).toBe('2026-04-13T10:00:00.000Z')
  })
})
