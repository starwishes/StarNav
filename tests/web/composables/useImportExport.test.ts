import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  messageSuccess: vi.fn(),
  messageInfo: vi.fn(),
  messageError: vi.fn(),
  confirm: vi.fn()
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    info: mocks.messageInfo,
    error: mocks.messageError
  },
  ElMessageBox: {
    confirm: mocks.confirm
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key
  })
}))

const { useImportExport } = await import('@/composables/admin/useImportExport')

describe('useImportExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes standard URLs and lowercases malformed input', () => {
    const composable = useImportExport(ref([]), ref([]), vi.fn())

    expect(composable.normalizeUrl('https://example.com/docs/?q=1')).toBe(
      'https://example.com/docs?q=1'
    )
    expect(composable.normalizeUrl(' EXAMPLE.COM/Docs/ ')).toBe('example.com/docs')
  })

  it('rejects invalid json imports without mutating local state', () => {
    const categories = ref([{ id: 1, name: 'Existing' }])
    const items = ref([
      { id: 1, name: 'Saved', url: 'https://saved.test', description: '', categoryId: 1 }
    ])
    const saveDataSync = vi.fn()
    const { handleJsonImport } = useImportExport(categories, items, saveDataSync)

    void handleJsonImport({ content: 'invalid' })

    expect(mocks.messageError).toHaveBeenCalledWith('admin.jsonError')
    expect(categories.value).toEqual([{ id: 1, name: 'Existing' }])
    expect(items.value).toEqual([
      { id: 1, name: 'Saved', url: 'https://saved.test', description: '', categoryId: 1 }
    ])
    expect(saveDataSync).not.toHaveBeenCalled()
  })

  it('merges json imports by category name and item URL, then persists once', async () => {
    const categories = ref([{ id: 3, name: 'Existing' }])
    const items = ref([
      { id: 10, name: 'Saved', url: 'https://saved.test', description: '', categoryId: 3 }
    ])
    const saveDataSync = vi.fn()
    const { handleJsonImport } = useImportExport(categories, items, saveDataSync)

    await handleJsonImport({
      meta: {
        schemaVersion: 1,
        exportedAt: '2026-04-13T10:00:00.000Z',
        categoryCount: 2,
        itemCount: 2
      },
      content: {
        categories: [
          { id: 1, name: 'Existing' },
          { id: 2, name: 'Imported' }
        ],
        items: [
          { id: 1, name: 'Saved Again', url: 'https://saved.test', description: '', categoryId: 1 },
          {
            id: 2,
            name: 'New Link',
            url: 'https://new.test',
            description: 'new',
            categoryId: 2
          }
        ]
      }
    })

    expect(categories.value).toEqual([
      { id: 3, name: 'Existing' },
      { id: 4, name: 'Imported' }
    ])
    expect(items.value).toEqual([
      { id: 10, name: 'Saved', url: 'https://saved.test', description: '', categoryId: 3 },
      { id: 11, name: 'New Link', url: 'https://new.test', description: 'new', categoryId: 4 }
    ])
    expect(mocks.messageSuccess).toHaveBeenCalledWith(
      'admin.importSuccess:{"count":1}. admin.importConfirm'
    )
    expect(saveDataSync).toHaveBeenCalledTimes(1)
  })

  it('rolls json import state back when persistence fails', async () => {
    const categories = ref([{ id: 1, name: 'Existing' }])
    const items = ref([
      { id: 1, name: 'Saved', url: 'https://saved.test', description: '', categoryId: 1 }
    ])
    const saveDataSync = vi.fn().mockRejectedValue(new Error('sync failed'))
    const { handleJsonImport } = useImportExport(categories, items, saveDataSync)

    await expect(
      handleJsonImport({
        meta: {
          schemaVersion: 1,
          exportedAt: '2026-04-13T10:00:00.000Z',
          categoryCount: 1,
          itemCount: 1
        },
        content: {
          categories: [{ id: 2, name: 'Imported' }],
          items: [
            {
              id: 3,
              name: 'New Link',
              url: 'https://new.test',
              description: 'new',
              categoryId: 2
            }
          ]
        }
      })
    ).resolves.toBe(false)

    expect(categories.value).toEqual([{ id: 1, name: 'Existing' }])
    expect(items.value).toEqual([
      { id: 1, name: 'Saved', url: 'https://saved.test', description: '', categoryId: 1 }
    ])
    expect(mocks.messageSuccess).not.toHaveBeenCalled()
  })

  it('imports browser bookmarks into missing categories and deduplicates by URL', async () => {
    const categories = ref([{ id: 1, name: 'Existing' }])
    const items = ref([
      { id: 2, name: 'Saved', url: 'https://saved.test', description: '', categoryId: 1 }
    ])
    const saveDataSync = vi.fn()
    const { handleBookmarkImport } = useImportExport(categories, items, saveDataSync)

    await expect(
      handleBookmarkImport({
        categories: ['Existing', 'Reading'],
        items: [
          {
            name: 'Saved Copy',
            url: 'https://saved.test',
            description: 'dup',
            categoryName: 'Existing'
          },
          {
            name: 'Fresh',
            url: 'https://fresh.test',
            description: '',
            categoryName: 'Reading'
          }
        ]
      })
    ).resolves.toBe(1)

    expect(categories.value).toEqual([
      { id: 1, name: 'Existing' },
      { id: 2, name: 'Reading' }
    ])
    expect(items.value).toEqual([
      { id: 2, name: 'Saved', url: 'https://saved.test', description: '', categoryId: 1 },
      {
        id: 3,
        name: 'Fresh',
        url: 'https://fresh.test',
        description: '',
        categoryId: 2,
        pinned: false,
        level: 0
      }
    ])
    expect(mocks.messageSuccess).toHaveBeenCalledWith('导入成功，已同步 1 个书签')
    expect(saveDataSync).toHaveBeenCalledTimes(1)
  })

  it('rolls bookmark import state back when persistence fails', async () => {
    const categories = ref([{ id: 1, name: 'Existing' }])
    const items = ref([
      { id: 2, name: 'Saved', url: 'https://saved.test', description: '', categoryId: 1 }
    ])
    const saveDataSync = vi.fn().mockRejectedValue(new Error('sync failed'))
    const { handleBookmarkImport } = useImportExport(categories, items, saveDataSync)

    await expect(
      handleBookmarkImport({
        categories: ['Reading'],
        items: [
          {
            name: 'Fresh',
            url: 'https://fresh.test',
            description: '',
            categoryName: 'Reading'
          }
        ]
      })
    ).rejects.toThrow('sync failed')

    expect(categories.value).toEqual([{ id: 1, name: 'Existing' }])
    expect(items.value).toEqual([
      { id: 2, name: 'Saved', url: 'https://saved.test', description: '', categoryId: 1 }
    ])
    expect(mocks.messageSuccess).not.toHaveBeenCalled()
  })

  it('returns duplicate item ids after confirmation, keeping the strongest candidate', async () => {
    mocks.confirm.mockResolvedValue('confirm')

    const categories = ref([{ id: 1, name: 'Docs' }])
    const items = ref([
      {
        id: 1,
        name: 'Keep me',
        url: 'https://example.com/docs/',
        description: '',
        categoryId: 1,
        clickCount: 9
      },
      {
        id: 2,
        name: 'Drop me',
        url: 'https://example.com/docs',
        description: '',
        categoryId: 1,
        clickCount: 3
      },
      {
        id: 3,
        name: 'Also drop',
        url: 'https://example.com/docs/',
        description: '',
        categoryId: 1,
        clickCount: 9
      }
    ])

    const { handleCleanDuplicates } = useImportExport(categories, items, vi.fn())
    const duplicateIds = await handleCleanDuplicates()

    expect(mocks.confirm).toHaveBeenCalledWith('manage.cleanConfirm', 'manage.cleanDuplicates', {
      confirmButtonText: 'common.confirm',
      cancelButtonText: 'common.cancel',
      type: 'warning'
    })
    expect(duplicateIds).toEqual([3, 2])
    expect(mocks.messageInfo).not.toHaveBeenCalled()
  })

  it('reports when there are no duplicates and returns an empty list on cancellation', async () => {
    const noDupes = useImportExport(
      ref([{ id: 1, name: 'Docs' }]),
      ref([{ id: 1, name: 'Unique', url: 'https://unique.test', description: '', categoryId: 1 }]),
      vi.fn()
    )

    await expect(noDupes.handleCleanDuplicates()).resolves.toBeUndefined()
    expect(mocks.messageInfo).toHaveBeenCalledWith('manage.noDuplicates')

    vi.clearAllMocks()
    mocks.confirm.mockRejectedValue('cancel')

    const withDupes = useImportExport(
      ref([{ id: 1, name: 'Docs' }]),
      ref([
        { id: 1, name: 'A', url: 'https://dupe.test', description: '', categoryId: 1 },
        { id: 2, name: 'B', url: 'https://dupe.test/', description: '', categoryId: 1 }
      ]),
      vi.fn()
    )

    await expect(withDupes.handleCleanDuplicates()).resolves.toEqual([])
    expect(mocks.confirm).toHaveBeenCalledTimes(1)
  })
})
