import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category, Item } from '@/types'
import type { StatsSummary } from '@/api/stats'

let adminStoreMock: any

const mocks = vi.hoisted(() => ({
  getContent: vi.fn(),
  getUsers: vi.fn(),
  getStatsSummary: vi.fn()
}))

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

vi.mock('@/api', () => ({
  dataApi: {
    getContent: mocks.getContent
  }
}))

vi.mock('@/api/admin', () => ({
  adminApi: {
    getUsers: mocks.getUsers
  }
}))

vi.mock('@/api/stats', async () => {
  const actual = await vi.importActual<typeof import('@/api/stats')>('@/api/stats')
  return {
    ...actual,
    getStatsSummary: mocks.getStatsSummary
  }
})

const { useStatsDashboard } = await import('@/composables/admin/useStatsDashboard')

type DashboardState = ReturnType<typeof useStatsDashboard>

let dashboard: DashboardState | null = null

const Harness = defineComponent({
  name: 'UseStatsDashboardHarness',
  setup() {
    dashboard = useStatsDashboard()
    return () => h('div')
  }
})

const mountHarness = async () => {
  dashboard = null
  const wrapper = mount(Harness)
  await flushPromises()
  return {
    wrapper,
    dashboard: dashboard!
  }
}

const createContent = (overrides: Partial<{ categories: Category[]; items: Item[] }> = {}) => ({
  categories: [
    {
      id: 1,
      name: 'Docs'
    }
  ],
  items: [
    {
      id: 101,
      name: 'Guide',
      url: 'https://guide.test',
      description: '',
      categoryId: 1,
      clickCount: 5
    },
    {
      id: 102,
      name: 'Orphan',
      url: 'https://orphan.test',
      description: '',
      categoryId: 999,
      clickCount: 10
    },
    {
      id: 103,
      name: 'News',
      url: 'https://news.test',
      description: '',
      categoryId: 1,
      clickCount: 2
    }
  ],
  ...overrides
})

const createStatsSummary = (overrides: Partial<StatsSummary> = {}): StatsSummary => ({
  today_pv: 12,
  today_uv: 8,
  total_pv: 120,
  total_uv: 64,
  trend: [
    {
      date: '2026-04-11',
      pv: 10,
      uv: 4
    },
    {
      date: '2026-04-12',
      pv: 20,
      uv: 8
    }
  ],
  distribution: {
    os: [
      { name: 'Windows', value: 3 },
      { name: '', value: 2 },
      { name: 'Ignored', value: 0 }
    ],
    browser: [
      { name: 'Chrome', value: 4 },
      { name: 'Firefox', value: 2 }
    ]
  },
  ...overrides
})

describe('useStatsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminStoreMock = {
      user: {
        login: 'admin',
        level: 3
      }
    }
  })

  it('fetches admin dashboard data and derives chart, ranking, and distribution models', async () => {
    mocks.getContent.mockResolvedValueOnce(createContent()).mockResolvedValueOnce(
      createContent({
        categories: [],
        items: [
          {
            id: 201,
            name: 'Fresh',
            url: 'https://fresh.test',
            description: '',
            categoryId: 300,
            clickCount: 1
          }
        ]
      })
    )
    mocks.getStatsSummary.mockResolvedValueOnce(createStatsSummary()).mockResolvedValueOnce(
      createStatsSummary({
        trend: [],
        distribution: {
          os: [],
          browser: []
        }
      })
    )
    mocks.getUsers
      .mockResolvedValueOnce([
        { username: 'admin', level: 3 },
        { username: 'alice', level: 1 },
        { username: 'bob', level: 2 }
      ])
      .mockResolvedValueOnce([{ username: 'admin', level: 3 }])

    const { dashboard, wrapper } = await mountHarness()

    expect(mocks.getContent).toHaveBeenCalledTimes(1)
    expect(mocks.getStatsSummary).toHaveBeenCalledTimes(1)
    expect(mocks.getUsers).toHaveBeenCalledTimes(1)

    expect(dashboard.loading.value).toBe(false)
    expect(dashboard.totalClicks.value).toBe(17)
    expect(dashboard.totalBookmarks.value).toBe(3)
    expect(dashboard.totalCategories.value).toBe(1)
    expect(dashboard.totalUsers.value).toBe(3)

    expect(dashboard.topBookmarks.value.map((item) => item.id)).toEqual([102, 101, 103])
    expect(dashboard.topBookmarks.value[0].categoryName).toBe('未分类')
    expect(dashboard.topBookmarks.value[1].categoryName).toBe('Docs')

    expect(dashboard.trendChartData.value.hasData).toBe(true)
    expect(dashboard.trendChartData.value.points).toHaveLength(2)
    expect(dashboard.trendChartData.value.points[0].label).toBe('04-11')
    expect(dashboard.trendChartData.value.yTicks).toHaveLength(5)
    expect(dashboard.trendChartData.value.pvLinePath).toContain('M ')
    expect(dashboard.trendChartData.value.pvLinePath).toContain('L ')
    expect(dashboard.trendChartData.value.uvAreaPath).toContain('Z')

    expect(dashboard.osDistribution.value.total).toBe(5)
    expect(dashboard.osDistribution.value.hasData).toBe(true)
    expect(dashboard.osDistribution.value.segments).toHaveLength(2)
    expect(dashboard.osDistribution.value.segments[0]).toMatchObject({
      name: 'Windows',
      value: 3,
      color: '#60a5fa'
    })
    expect(dashboard.osDistribution.value.segments[1]).toMatchObject({
      name: 'Unknown',
      value: 2,
      color: '#34d399'
    })
    expect(dashboard.osDistribution.value.segments[0].percent).toBeCloseTo(60)

    expect(dashboard.browserDistribution.value.total).toBe(6)
    expect(dashboard.browserDistribution.value.segments[0]).toMatchObject({
      name: 'Chrome',
      color: '#38bdf8'
    })
    expect(dashboard.browserDistribution.value.segments[1]).toMatchObject({
      name: 'Firefox',
      color: '#f97316'
    })

    await dashboard.refresh()
    await flushPromises()

    expect(mocks.getContent).toHaveBeenCalledTimes(2)
    expect(mocks.getStatsSummary).toHaveBeenCalledTimes(2)
    expect(mocks.getUsers).toHaveBeenCalledTimes(2)
    expect(dashboard.totalClicks.value).toBe(1)
    expect(dashboard.totalUsers.value).toBe(1)
    expect(dashboard.topBookmarks.value[0].categoryName).toBe('未分类')
    expect(dashboard.trendChartData.value.hasData).toBe(false)
    expect(dashboard.osDistribution.value).toEqual({
      total: 0,
      hasData: false,
      segments: []
    })
    expect(dashboard.browserDistribution.value).toEqual({
      total: 0,
      hasData: false,
      segments: []
    })

    wrapper.unmount()
  })

  it('skips admin-only user loading for non-admin viewers', async () => {
    adminStoreMock.user = {
      login: 'member',
      level: 2
    }
    mocks.getContent.mockResolvedValue(createContent())
    mocks.getStatsSummary.mockResolvedValue(createStatsSummary())
    mocks.getUsers.mockResolvedValue([{ username: 'hidden', level: 3 }])

    const { dashboard, wrapper } = await mountHarness()

    expect(mocks.getContent).toHaveBeenCalledTimes(1)
    expect(mocks.getStatsSummary).toHaveBeenCalledTimes(1)
    expect(mocks.getUsers).not.toHaveBeenCalled()
    expect(dashboard.totalUsers.value).toBe(0)
    expect(dashboard.totalClicks.value).toBe(17)

    wrapper.unmount()
  })
})
