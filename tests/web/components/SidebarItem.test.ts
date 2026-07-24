import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/types'

const SidebarItem = (await import('@/components/index/SidebarItem.vue')).default

const createWrapper = (
  category: Category,
  depth = 0,
  overrides: {
    isSidebarCollapsed?: boolean
    expandedIds?: Set<number>
    activeCategoryId?: number | null
    toggleExpand?: ReturnType<typeof vi.fn>
    selectCategory?: ReturnType<typeof vi.fn>
  } = {}
) => {
  const toggleExpand = overrides.toggleExpand || vi.fn()
  const selectCategory = overrides.selectCategory || vi.fn()

  return {
    wrapper: mount(SidebarItem, {
      props: {
        category,
        depth
      },
      global: {
        provide: {
          isSidebarCollapsed: ref(overrides.isSidebarCollapsed ?? false),
          expandedIds: reactive(overrides.expandedIds || new Set<number>()),
          activeCategoryId: ref(overrides.activeCategoryId ?? null),
          toggleExpand,
          selectCategory
        }
      }
    }),
    toggleExpand,
    selectCategory
  }
}

describe('SidebarItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initials for root categories, reflects active state, and expands branches', async () => {
    const { wrapper, toggleExpand, selectCategory } = createWrapper(
      {
        id: 1,
        name: 'Dev Tools',
        children: [{ id: 2, name: 'API', children: [] }]
      },
      0,
      {
        activeCategoryId: 1,
        expandedIds: new Set<number>([1])
      }
    )

    expect(wrapper.classes()).toContain('active')
    expect(wrapper.find('.category-initial').text()).toBe('DT')
    expect(wrapper.find('.category-name').text()).toBe('Dev Tools')
    expect(wrapper.find('.sub-category-list').exists()).toBe(true)

    await wrapper.find('.category-header').trigger('click')

    expect(toggleExpand).toHaveBeenCalledWith(1)
    expect(selectCategory).not.toHaveBeenCalled()
  })

  it('selects leaf categories in collapsed mode and uses real icon urls', async () => {
    const { wrapper, toggleExpand, selectCategory } = createWrapper(
      {
        id: 3,
        name: 'API Docs',
        icon: '/icons/api.svg',
        children: []
      },
      0,
      {
        isSidebarCollapsed: true
      }
    )

    expect(wrapper.find('.category-header').attributes('title')).toBe('API Docs')
    expect(wrapper.find('.category-name').exists()).toBe(false)
    expect(wrapper.find('.category-initial').text()).toBe('AD')
    expect(wrapper.find('.category-header').attributes('style')).toBeUndefined()

    await wrapper.find('.category-header').trigger('click')

    expect(selectCategory).toHaveBeenCalledWith(3, null)
    expect(toggleExpand).not.toHaveBeenCalled()
  })

  it('always renders generated initials for root categories even when icon metadata exists', () => {
    const { wrapper } = createWrapper(
      {
        id: 6,
        name: 'AI 与研究',
        icon: 'icon-ai',
        children: []
      },
      0
    )

    expect(wrapper.find('.category-initial').exists()).toBe(true)
    expect(wrapper.find('.category-initial').text()).toBe('AI')
    expect(wrapper.find('.category-icon').exists()).toBe(false)
    expect(wrapper.find('.category-icon-img').exists()).toBe(false)
  })

  it('selects collapsed parent categories instead of attempting to expand them', async () => {
    const { wrapper, toggleExpand, selectCategory } = createWrapper(
      {
        id: 4,
        name: 'Guides',
        children: [{ id: 5, name: 'Nested', children: [] }]
      },
      0,
      {
        isSidebarCollapsed: true
      }
    )

    await wrapper.find('.category-header').trigger('click')

    expect(selectCategory).toHaveBeenCalledWith(4, null)
    expect(toggleExpand).not.toHaveBeenCalled()
  })

  it('renders generated initials for child categories too', () => {
    const { wrapper } = createWrapper(
      {
        id: 7,
        name: 'API Docs',
        children: []
      },
      1
    )

    expect(wrapper.find('.category-initial').exists()).toBe(true)
    expect(wrapper.find('.category-initial').text()).toBe('AD')
  })
})
