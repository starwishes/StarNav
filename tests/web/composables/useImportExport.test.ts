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

  it('normalizes URLs with the shared canonicalizer (lowercases host, strips trailing slash)', () => {
    const composable = useImportExport(ref([]), ref([]), vi.fn())

    expect(composable.normalizeUrl('https://example.com/docs/?q=1')).toBe(
      'https://example.com/docs?q=1'
    )
    expect(composable.normalizeUrl(' EXAMPLE.COM/Docs/ ')).toBe('https://example.com/Docs')
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
    expect(mocks.messageSuccess).toHaveBeenCalledWith('admin.importSuccess:{"count":1}')
    expect(saveDataSync).toHaveBeenCalledTimes(1)
  })

  it('rejects javascript: and other unsafe URLs during json import', async () => {
    const categories = ref([{ id: 1, name: 'Existing' }])
    const items = ref([])
    const saveDataSync = vi.fn()
    const { handleJsonImport } = useImportExport(categories, items, saveDataSync)

    await handleJsonImport({
      meta: {
        schemaVersion: 1,
        exportedAt: '2026-04-13T10:00:00.000Z',
        categoryCount: 1,
        itemCount: 3
      },
      content: {
        categories: [{ id: 1, name: 'Existing' }],
        items: [
          { id: 1, name: 'Good', url: 'https://good.test', description: '', categoryId: 1 },
          { id: 2, name: 'Evil', url: 'javascript:alert(1)', description: '', categoryId: 1 },
          {
            id: 3,
            name: 'Data',
            url: 'data:text/html,<script>alert(1)</script>',
            description: '',
            categoryId: 1
          }
        ]
      }
    })

    expect(items.value).toEqual([
      { id: 1, name: 'Good', url: 'https://good.test', description: '', categoryId: 1 }
    ])
    expect(mocks.messageSuccess).toHaveBeenCalledWith('admin.importSuccess:{"count":1}')
  })

  it('deduplicates json imports by normalized url so trailing slashes collide', async () => {
    const categories = ref([{ id: 1, name: 'Existing' }])
    const items = ref([
      { id: 10, name: 'Saved', url: 'https://x.com', description: '', categoryId: 1 }
    ])
    const saveDataSync = vi.fn()
    const { handleJsonImport } = useImportExport(categories, items, saveDataSync)

    await handleJsonImport({
      meta: {
        schemaVersion: 1,
        exportedAt: '2026-04-13T10:00:00.000Z',
        categoryCount: 1,
        itemCount: 2
      },
      content: {
        categories: [{ id: 1, name: 'Existing' }],
        items: [
          { id: 1, name: 'Duplicate Slash', url: 'https://x.com/', description: '', categoryId: 1 },
          { id: 2, name: 'Unique', url: 'https://y.com/', description: '', categoryId: 1 }
        ]
      }
    })

    expect(items.value).toEqual([
      { id: 10, name: 'Saved', url: 'https://x.com', description: '', categoryId: 1 },
      { id: 11, name: 'Unique', url: 'https://y.com/', description: '', categoryId: 1 }
    ])
    expect(mocks.messageSuccess).toHaveBeenCalledWith('admin.importSuccess:{"count":1}')
  })

  it('remaps imported parentId into the target id space when a parent name merges into an existing category', async () => {
    // Existing category with id 100 shares the name with the imported root, and an
    // unrelated category already holds id 1 — so an unremapped parentId: 1 would
    // dangle (or worse, attach to the unrelated category).
    const categories = ref([
      { id: 1, name: 'Dev' },
      { id: 100, name: 'Root' }
    ])
    const items = ref([])
    const saveDataSync = vi.fn()
    const { handleJsonImport } = useImportExport(categories, items, saveDataSync)

    await handleJsonImport({
      meta: {
        schemaVersion: 1,
        exportedAt: '2026-04-13T10:00:00.000Z',
        categoryCount: 3,
        itemCount: 1
      },
      content: {
        categories: [
          { id: 1, name: 'Root', parentId: null },
          { id: 2, name: 'Sub', parentId: 1 },
          { id: 3, name: 'Nested', parentId: 2 }
        ],
        items: [{ id: 5, name: 'X', url: 'https://x.test', description: '', categoryId: 2 }]
      }
    })

    expect(categories.value).toEqual([
      { id: 1, name: 'Dev' },
      { id: 100, name: 'Root' },
      { id: 101, name: 'Sub', parentId: 100 },
      { id: 102, name: 'Nested', parentId: 101 }
    ])
    expect(items.value[0]).toEqual(
      expect.objectContaining({ id: 1, url: 'https://x.test', categoryId: 101 })
    )
  })

  it('keeps imported children as root categories when the parent has no target mapping', async () => {
    const categories = ref([])
    const items = ref([])
    const saveDataSync = vi.fn()
    const { handleJsonImport } = useImportExport(categories, items, saveDataSync)

    await handleJsonImport({
      meta: {
        schemaVersion: 1,
        exportedAt: '2026-04-13T10:00:00.000Z',
        categoryCount: 2,
        itemCount: 0
      },
      content: {
        categories: [
          // parentId 999 exists in neither the backup nor the target set
          { id: 1, name: 'Dangling Child', parentId: 999 },
          { id: 2, name: 'Zero Parent', parentId: 0 }
        ],
        items: []
      }
    })

    expect(categories.value).toEqual([
      { id: 1, name: 'Dangling Child', parentId: null },
      { id: 2, name: 'Zero Parent', parentId: null }
    ])
  })

  it('uses the uncategorized id 0 when browser import has no matching category and none exist', async () => {
    const categories = ref([])
    const items = ref([])
    const saveDataSync = vi.fn()
    const { handleBookmarkImport } = useImportExport(categories, items, saveDataSync)

    await expect(
      handleBookmarkImport({
        categories: [],
        items: [
          {
            name: 'Orphan',
            url: 'https://orphan.test',
            description: '',
            categoryName: 'Does Not Exist'
          }
        ]
      })
    ).resolves.toBe(1)

    expect(categories.value).toEqual([])
    expect(items.value[0]).toEqual(
      expect.objectContaining({
        id: 1,
        name: 'Orphan',
        url: 'https://orphan.test',
        categoryId: 0
      })
    )
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
    expect(mocks.messageSuccess).toHaveBeenCalledWith('admin.importSuccess:{"count":1}')
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
    const result = await handleCleanDuplicates()

    expect(mocks.confirm).toHaveBeenCalledWith('manage.cleanConfirm', 'manage.cleanDuplicates', {
      confirmButtonText: 'common.confirm',
      cancelButtonText: 'common.cancel',
      type: 'warning'
    })
    expect(result).toEqual({ deleted: 2, ids: [3, 2] })
    expect(mocks.messageInfo).not.toHaveBeenCalled()
  })

  it('reports when there are no duplicates and returns an empty list on cancellation', async () => {
    const noDupes = useImportExport(
      ref([{ id: 1, name: 'Docs' }]),
      ref([{ id: 1, name: 'Unique', url: 'https://unique.test', description: '', categoryId: 1 }]),
      vi.fn()
    )

    await expect(noDupes.handleCleanDuplicates()).resolves.toEqual({ deleted: 0, ids: [] })
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

    await expect(withDupes.handleCleanDuplicates()).resolves.toEqual({ deleted: 0, ids: [] })
    expect(mocks.confirm).toHaveBeenCalledTimes(1)
  })
})
