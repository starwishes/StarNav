import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAppSelectValue, openAppSelect, selectAppOption } from '../helpers/appSelect'

const dataStoreMock = {
  addCategory: vi.fn()
}

vi.mock('@/store/data', () => ({
  useDataStore: () => dataStoreMock
}))

vi.mock('@/api/admin', () => ({
  adminApi: {
    uploadIconAsset: vi.fn()
  }
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

vi.mock('@common/constants', () => ({
  USER_LEVEL: {
    GUEST: 0,
    USER: 1,
    VIP: 2,
    ADMIN: 3
  }
}))

const BookmarkForm = (await import('@/components/SiteDialog/BookmarkForm.vue')).default

describe('BookmarkForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not open the inline add panel when opening the category selector', async () => {
    const wrapper = mount(BookmarkForm, {
      props: {
        modelValue: {
          name: '',
          url: '',
          categoryId: 1,
          level: 0
        },
        categoryTree: [
          { id: 1, name: '常用推荐', parentId: null, level: 0, children: [] },
          { id: 2, name: '工具箱', parentId: null, level: 0, children: [] }
        ]
      }
    })

    await openAppSelect(wrapper.find('.category-selector-wrap .dialog-select'))
    await nextTick()

    expect(wrapper.find('.inline-cat-panel').exists()).toBe(false)
  })

  it('supports selecting a parent category first and then a subcategory', async () => {
    const modelValue = {
      name: '',
      url: '',
      categoryId: 1,
      level: 0
    }

    const wrapper = mount(BookmarkForm, {
      props: {
        modelValue,
        categoryTree: [
          {
            id: 1,
            value: 1,
            name: '常用推荐',
            label: '常用推荐',
            children: [
              {
                id: 11,
                value: 11,
                name: '开发工具',
                label: '开发工具',
                children: []
              }
            ]
          },
          {
            id: 2,
            value: 2,
            name: '工具箱',
            label: '工具箱',
            children: []
          }
        ]
      }
    })

    await selectAppOption(wrapper.find('.category-selector-wrap .dialog-select'), 1)
    await nextTick()

    expect(wrapper.find('.dialog-select--child').exists()).toBe(true)
    expect(modelValue.categoryId).toBe(1)

    await selectAppOption(wrapper.find('.dialog-select--child'), 11)
    await nextTick()

    expect(modelValue.categoryId).toBe(11)
    expect(getAppSelectValue(wrapper, '.dialog-select--child')).toBe('11')
  })
})
