import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category, Item } from '@/types'

const isMobileRef = ref(false)

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

vi.mock('@/composables/useMobile', () => ({
  useMobile: () => ({
    isMobile: isMobileRef
  })
}))

const CategoryTable = (await import('@/components/CategoryTable.vue')).default

const categories: Category[] = [
  { id: 1, name: 'Docs', level: 0 },
  { id: 2, name: 'Tools', level: 2 },
  { id: 3, name: 'Admin', level: 3 }
]

const items: Item[] = [
  {
    id: 11,
    name: 'Vue',
    url: 'https://vuejs.org',
    description: 'Vue docs',
    categoryId: 1
  },
  {
    id: 12,
    name: 'Vitest',
    url: 'https://vitest.dev',
    description: 'Vitest docs',
    categoryId: 1
  },
  {
    id: 13,
    name: 'Pinia',
    url: 'https://pinia.vuejs.org',
    description: 'Pinia docs',
    categoryId: 2
  }
]

const createWrapper = (props: Partial<{ categories: Category[]; items: Item[] }> = {}) =>
  mount(CategoryTable, {
    props: {
      categories,
      items,
      ...props
    }
  })

describe('CategoryTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isMobileRef.value = false
  })

  it('renders an empty state when there are no categories', () => {
    const wrapper = createWrapper({ categories: [] })

    expect(wrapper.text()).toContain('translated:common.noData')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('renders counts and visibility labels, and emits row actions', async () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('translated:userLevel.guest')
    expect(wrapper.text()).toContain('translated:userLevel.vip')
    expect(wrapper.text()).toContain('translated:userLevel.admin')
    expect(wrapper.findAll('.sn-badge.is-primary')[0].text()).toBe('2')
    expect(wrapper.findAll('.sn-badge.is-primary')[1].text()).toBe('1')

    const rows = wrapper.findAll('tbody tr')
    const firstRowButtons = rows[0].findAll('.table-action')
    const secondRowButtons = rows[1].findAll('.table-action')
    const thirdRowButtons = rows[2].findAll('.table-action')

    expect(firstRowButtons[1].attributes('disabled')).toBeDefined()
    expect(thirdRowButtons[2].attributes('disabled')).toBeDefined()

    await secondRowButtons[0].trigger('click')
    await secondRowButtons[1].trigger('click')
    await secondRowButtons[2].trigger('click')
    await secondRowButtons[3].trigger('click')

    expect(wrapper.emitted('edit')).toEqual([[categories[1]]])
    expect(wrapper.emitted('move')).toEqual([
      [1, 'up'],
      [1, 'down']
    ])
    expect(wrapper.emitted('delete')).toEqual([[categories[1]]])
  })

  it('hides desktop-only columns on mobile', () => {
    isMobileRef.value = true

    const wrapper = createWrapper()

    expect(wrapper.findAll('thead th')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('translated:table.id')
    expect(wrapper.text()).not.toContain('translated:table.visibility')
    expect(wrapper.text()).not.toContain('translated:table.siteCount')
  })
})
