import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const statsState = {
  accessStats: ref<any>(null),
  totalClicks: ref(0),
  totalBookmarks: ref(0),
  totalCategories: ref(0),
  totalUsers: ref(0),
  topBookmarks: ref<any[]>([]),
  trendChartData: ref<any>({
    hasData: false,
    width: 640,
    height: 280,
    padding: { top: 20, right: 22, bottom: 34, left: 44 },
    yTicks: [],
    points: [],
    pvLinePath: '',
    uvLinePath: '',
    pvAreaPath: '',
    uvAreaPath: ''
  }),
  osDistribution: ref<any>({
    total: 0,
    hasData: false,
    segments: []
  }),
  browserDistribution: ref<any>({
    total: 0,
    hasData: false,
    segments: []
  })
}

vi.mock('@/composables/admin/useStatsDashboard', () => ({
  useStatsDashboard: () => statsState
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

const TrendChartCardStub = defineComponent({
  name: 'TrendChartCard',
  props: ['title', 'emptyLabel', 'chartData'],
  setup(props) {
    return () =>
      h('div', { class: 'trend-chart-card-stub' }, [
        h('span', { class: 'stub-title' }, String(props.title)),
        h('span', { class: 'stub-empty-label' }, String(props.emptyLabel)),
        h('span', { class: 'stub-has-data' }, String((props.chartData as any)?.hasData))
      ])
  }
})

const DistributionChartCardStub = defineComponent({
  name: 'DistributionChartCard',
  props: ['title', 'distribution', 'emptyLabel', 'totalLabel'],
  setup(props) {
    return () =>
      h('div', { class: 'distribution-chart-card-stub' }, [
        h('span', { class: 'stub-title' }, String(props.title)),
        h('span', { class: 'stub-total' }, String((props.distribution as any)?.total)),
        h('span', { class: 'stub-total-label' }, String(props.totalLabel))
      ])
  }
})

const TopBookmarksTableStub = defineComponent({
  name: 'TopBookmarksTable',
  props: ['title', 'items'],
  setup(props) {
    return () =>
      h('div', { class: 'top-bookmarks-table-stub' }, [
        h('span', { class: 'stub-title' }, String(props.title)),
        h('span', { class: 'stub-count' }, String((props.items as any[])?.length || 0))
      ])
  }
})

const StatsDashboard = (await import('@/components/admin/StatsDashboard.vue')).default

const createWrapper = () =>
  mount(StatsDashboard, {
    global: {
      stubs: {
        TrendChartCard: TrendChartCardStub,
        DistributionChartCard: DistributionChartCardStub,
        TopBookmarksTable: TopBookmarksTableStub
      }
    }
  })

describe('StatsDashboard', () => {
  beforeEach(() => {
    statsState.accessStats.value = {
      today_pv: 11,
      today_uv: 7,
      total_pv: 128,
      total_uv: 64
    }
    statsState.totalClicks.value = 321
    statsState.totalBookmarks.value = 18
    statsState.totalCategories.value = 6
    statsState.totalUsers.value = 4
    statsState.topBookmarks.value = [{ id: 1 }, { id: 2 }]
    statsState.trendChartData.value = {
      hasData: true,
      width: 640,
      height: 280,
      padding: { top: 20, right: 22, bottom: 34, left: 44 },
      yTicks: [],
      points: [],
      pvLinePath: 'M 0 0',
      uvLinePath: 'M 0 0',
      pvAreaPath: 'M 0 0 Z',
      uvAreaPath: 'M 0 0 Z'
    }
    statsState.osDistribution.value = {
      total: 9,
      hasData: true,
      segments: [{ name: 'Linux', value: 9, percent: 100, color: '#000', path: 'M' }]
    }
    statsState.browserDistribution.value = {
      total: 12,
      hasData: true,
      segments: [{ name: 'Firefox', value: 12, percent: 100, color: '#111', path: 'M' }]
    }
  })

  it('renders access summary cards and content overview metrics', () => {
    const wrapper = createWrapper()

    const accessCards = wrapper.findAll('.stats-cards .stat-card')
    expect(accessCards).toHaveLength(4)
    expect(accessCards[0].text()).toContain('translated:stats.todayPV')
    expect(accessCards[0].text()).toContain('11')
    expect(accessCards[3].text()).toContain('translated:stats.totalUV')
    expect(accessCards[3].text()).toContain('64')

    const summaryCards = wrapper.findAll('.simple-stats-grid .stat-card-simple')
    expect(summaryCards).toHaveLength(4)
    expect(wrapper.text()).toContain('translated:stats.totalBookmarks')
    expect(wrapper.text()).toContain('translated:stats.totalCategories')
    expect(wrapper.text()).toContain('translated:stats.totalClicks')
    expect(wrapper.text()).toContain('translated:stats.totalUsers')
  })

  it('passes translated titles and data into the chart/table child components', () => {
    const wrapper = createWrapper()
    const trendStub = wrapper.find('.trend-chart-card-stub')
    const distributionStubs = wrapper.findAll('.distribution-chart-card-stub')
    const topTableStub = wrapper.find('.top-bookmarks-table-stub')

    expect(trendStub.text()).toContain('translated:stats.visitTrend')
    expect(trendStub.text()).toContain('translated:common.noData')
    expect(trendStub.text()).toContain('true')

    expect(distributionStubs[0].text()).toContain('translated:stats.osDistribution')
    expect(distributionStubs[0].text()).toContain('9')
    expect(distributionStubs[1].text()).toContain('translated:stats.browserDistribution')
    expect(distributionStubs[1].text()).toContain('12')

    expect(topTableStub.text()).toContain('🔥 translated:stats.topBookmarks')
    expect(topTableStub.text()).toContain('2')
  })

  it('hides the total-users card when there are no users', async () => {
    const wrapper = createWrapper()
    statsState.totalUsers.value = 0
    await wrapper.vm.$nextTick()

    const summaryCards = wrapper.findAll('.simple-stats-grid .stat-card-simple')
    expect(summaryCards).toHaveLength(3)
    expect(wrapper.text()).not.toContain('translated:stats.totalUsers')
  })
})
