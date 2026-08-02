import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/composables/useDateTimeFormatter', () => ({
  useDateTimeFormatter: () => ({
    formatDateTime: (value: string) => `formatted:${value}`
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

const TopBookmarksTable = (await import('@/components/admin/stats/TopBookmarksTable.vue')).default

describe('TopBookmarksTable', () => {
  it('renders bookmark ranking rows with formatted last-visited timestamps', () => {
    const wrapper = mount(TopBookmarksTable, {
      props: {
        title: 'Top Bookmarks',
        items: [
          {
            id: 1,
            name: 'StarNav',
            url: 'https://star.test',
            description: '',
            categoryId: 1,
            categoryName: 'Docs',
            clickCount: 12,
            lastVisited: '2026-04-13T10:00:00.000Z'
          },
          {
            id: 2,
            name: 'Vue',
            url: 'https://vuejs.org',
            description: '',
            categoryId: 1,
            categoryName: 'Docs',
            clickCount: 8
          }
        ]
      }
    })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('1')
    expect(rows[0].text()).toContain('StarNav')
    expect(rows[0].text()).toContain('12')
    expect(rows[0].text()).toContain('Docs')
    expect(rows[0].text()).toContain('formatted:2026-04-13T10:00:00.000Z')
    expect(rows[1].text()).toContain('-')
  })
})
