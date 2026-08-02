import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let adminStoreMock: any
let categoryTreeRef: ReturnType<typeof ref<any[]>>

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

vi.mock('@/composables/useSiteProjection', () => ({
  useSiteProjection: () => ({
    categoryTree: categoryTreeRef
  })
}))

const { useSiteFilter } = await import('@/composables/useSiteFilter')

describe('useSiteFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminStoreMock = {
      isAuthenticated: false,
      user: {
        level: 1
      }
    }
    categoryTreeRef = ref([
      {
        id: 1,
        name: 'Docs',
        level: 0,
        content: [
          {
            id: 10,
            name: 'Public',
            url: 'https://public.test',
            description: '',
            categoryId: 1,
            pinned: true
          },
          { id: 11, name: 'VIP', url: 'https://vip.test', description: '', categoryId: 1, level: 2 }
        ],
        children: [
          {
            id: 2,
            name: 'Admin',
            level: 3,
            content: [
              {
                id: 12,
                name: 'Admin Secret',
                url: 'https://admin.test',
                description: '',
                categoryId: 2
              }
            ],
            children: []
          }
        ]
      }
    ])
  })

  it('filters categories and items by visitor level while prepending a pinned virtual category', () => {
    const { filteredData } = useSiteFilter()

    expect(filteredData.value).toHaveLength(2)
    expect(filteredData.value[0]).toEqual(
      expect.objectContaining({
        id: -1,
        isVirtual: true,
        name: 'translated:site.pinnedCategory'
      })
    )
    expect(filteredData.value[0].content).toEqual([
      expect.objectContaining({
        id: 10,
        _isPinnedReplica: true
      })
    ])
    expect(filteredData.value[1].content?.map((item: any) => item.id)).toEqual([10])
    expect(filteredData.value[1].children).toEqual([])
  })

  it('keeps restricted categories visible during drag mode for authenticated admins', () => {
    adminStoreMock.isAuthenticated = true
    adminStoreMock.user.level = 3

    const { filteredData } = useSiteFilter({ active: true })

    expect(filteredData.value.some((category: any) => category.id === 1)).toBe(true)
    expect(filteredData.value[1].children).toEqual([
      expect.objectContaining({
        id: 2
      })
    ])
  })

  it('omits the pinned category when no pinned items remain after filtering', () => {
    categoryTreeRef.value = [
      {
        id: 1,
        name: 'Docs',
        level: 0,
        content: [
          {
            id: 10,
            name: 'Private Pin',
            url: 'https://private.test',
            description: '',
            categoryId: 1,
            pinned: true,
            level: 3
          }
        ],
        children: []
      }
    ]

    const { filteredData } = useSiteFilter()

    expect(filteredData.value).toEqual([
      expect.objectContaining({
        id: 1,
        content: []
      })
    ])
  })
})
