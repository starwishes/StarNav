import { computed, onMounted, ref } from 'vue'
import { useAdminStore } from '@/store/admin'
import { dataApi } from '@/api'
import { adminApi } from '@/api/admin'
import { getStatsSummary, type StatsSummary } from '@/api/stats'
import type { Category, Item } from '@/types'
import { createScopedLogger } from '../../../shared/logger.js'

export interface TrendChartTick {
  value: number
  y: number
}

export interface TrendChartPoint {
  label: string
  x: number
  pvY: number
  uvY: number
  pv: number
  uv: number
}

export interface TrendChartData {
  hasData: boolean
  width: number
  height: number
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
  yTicks: TrendChartTick[]
  points: TrendChartPoint[]
  pvLinePath: string
  uvLinePath: string
  pvAreaPath: string
  uvAreaPath: string
}

export interface DistributionSegment {
  name: string
  value: number
  percent: number
  color: string
  path: string
}

export interface DistributionData {
  total: number
  hasData: boolean
  segments: DistributionSegment[]
}

export interface TopBookmarkRow extends Item {
  categoryName: string
}

const TREND_WIDTH = 640
const TREND_HEIGHT = 280
const TREND_PADDING = {
  top: 20,
  right: 22,
  bottom: 34,
  left: 44
}
const TREND_INNER_WIDTH = TREND_WIDTH - TREND_PADDING.left - TREND_PADDING.right
const TREND_INNER_HEIGHT = TREND_HEIGHT - TREND_PADDING.top - TREND_PADDING.bottom
const TREND_BASELINE = TREND_HEIGHT - TREND_PADDING.bottom
const DONUT_CENTER = 110
const DONUT_RADIUS = 74
const OS_COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#22d3ee']
const BROWSER_COLORS = ['#38bdf8', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b']
const logger = createScopedLogger('web:stats-dashboard')

const buildLinePath = (points: TrendChartPoint[], key: 'pvY' | 'uvY') =>
  points
    .map(
      (point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point[key].toFixed(2)}`
    )
    .join(' ')

const buildAreaPath = (points: TrendChartPoint[], key: 'pvY' | 'uvY') => {
  if (!points.length) {
    return ''
  }

  const linePath = buildLinePath(points, key)
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]

  return `${linePath} L ${lastPoint.x.toFixed(2)} ${TREND_BASELINE.toFixed(2)} L ${firstPoint.x.toFixed(2)} ${TREND_BASELINE.toFixed(2)} Z`
}

const polarToCartesian = (centerX: number, centerY: number, radius: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians)
  }
}

const describeArc = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
) => {
  const start = polarToCartesian(centerX, centerY, radius, endAngle)
  const end = polarToCartesian(centerX, centerY, radius, startAngle)
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

const normalizeDistributionEntries = (entries?: StatsSummary['distribution']['os']) =>
  Array.isArray(entries)
    ? entries
        .map((entry) => ({
          name: entry?.name || 'Unknown',
          value: Number(entry?.value || 0)
        }))
        .filter((entry) => entry.value > 0)
    : []

const buildDistribution = (
  entries: StatsSummary['distribution']['os'] | undefined,
  palette: string[]
): DistributionData => {
  const normalizedEntries = normalizeDistributionEntries(entries)
  const total = normalizedEntries.reduce((sum, entry) => sum + entry.value, 0)

  if (!normalizedEntries.length || total <= 0) {
    return {
      total: 0,
      hasData: false,
      segments: []
    }
  }

  let currentAngle = 0
  const segments = normalizedEntries.map((entry, index) => {
    const ratio = entry.value / total
    const angle = ratio * 359.999
    const segment = {
      ...entry,
      percent: ratio * 100,
      color: palette[index % palette.length],
      path: describeArc(
        DONUT_CENTER,
        DONUT_CENTER,
        DONUT_RADIUS,
        currentAngle,
        currentAngle + angle
      )
    }
    currentAngle += angle
    return segment
  })

  return {
    total,
    hasData: true,
    segments
  }
}

export function useStatsDashboard() {
  const adminStore = useAdminStore()

  const loading = ref(false)
  const accessStats = ref<StatsSummary | null>(null)
  const items = ref<Item[]>([])
  const categories = ref<Category[]>([])
  const totalUsers = ref(0)

  const totalClicks = computed(() =>
    items.value.reduce((sum, item) => sum + (item.clickCount || 0), 0)
  )
  const totalBookmarks = computed(() => items.value.length)
  const totalCategories = computed(() => categories.value.length)

  const topBookmarks = computed<TopBookmarkRow[]>(() => {
    const catMap = new Map(categories.value.map((category) => [category.id, category.name]))
    return [...items.value]
      .sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))
      .slice(0, 10)
      .map((item) => ({
        ...item,
        categoryName: catMap.get(item.categoryId) || '未分类'
      }))
  })

  const trendChartData = computed<TrendChartData>(() => {
    const trend = Array.isArray(accessStats.value?.trend)
      ? accessStats.value!.trend.map((item) => ({
          label: String(item?.date || '').slice(5),
          pv: Number(item?.pv || 0),
          uv: Number(item?.uv || 0)
        }))
      : []

    if (!trend.length) {
      return {
        hasData: false,
        width: TREND_WIDTH,
        height: TREND_HEIGHT,
        padding: TREND_PADDING,
        yTicks: [],
        points: [],
        pvLinePath: '',
        uvLinePath: '',
        pvAreaPath: '',
        uvAreaPath: ''
      }
    }

    const maxValue = Math.max(
      1,
      ...trend.flatMap((item) => [item.pv, item.uv]).filter((value) => Number.isFinite(value))
    )
    const denominator = Math.max(trend.length - 1, 1)
    const points = trend.map((item, index) => {
      const x =
        TREND_PADDING.left + TREND_INNER_WIDTH * (trend.length === 1 ? 0.5 : index / denominator)

      return {
        label: item.label,
        x,
        pvY: TREND_PADDING.top + TREND_INNER_HEIGHT * (1 - item.pv / maxValue),
        uvY: TREND_PADDING.top + TREND_INNER_HEIGHT * (1 - item.uv / maxValue),
        pv: item.pv,
        uv: item.uv
      }
    })

    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4
      return {
        value: Math.round(maxValue * (1 - ratio)),
        y: TREND_PADDING.top + TREND_INNER_HEIGHT * ratio
      }
    })

    return {
      hasData: true,
      width: TREND_WIDTH,
      height: TREND_HEIGHT,
      padding: TREND_PADDING,
      yTicks,
      points,
      pvLinePath: buildLinePath(points, 'pvY'),
      uvLinePath: buildLinePath(points, 'uvY'),
      pvAreaPath: buildAreaPath(points, 'pvY'),
      uvAreaPath: buildAreaPath(points, 'uvY')
    }
  })

  const osDistribution = computed(() =>
    buildDistribution(accessStats.value?.distribution?.os, OS_COLORS)
  )
  const browserDistribution = computed(() =>
    buildDistribution(accessStats.value?.distribution?.browser, BROWSER_COLORS)
  )

  const fetchData = async () => {
    loading.value = true

    try {
      const [content, statsSummary, userList] = await Promise.all([
        dataApi.getContent(),
        getStatsSummary(),
        adminStore.user?.level === 3 ? adminApi.getUsers() : Promise.resolve([])
      ])

      items.value = content.items
      categories.value = content.categories
      totalUsers.value = userList.length
      accessStats.value = statsSummary
    } catch (error) {
      logger.error('Failed to fetch stats dashboard data.', error)
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchData)

  return {
    accessStats,
    loading,
    totalClicks,
    totalBookmarks,
    totalCategories,
    totalUsers,
    topBookmarks,
    trendChartData,
    osDistribution,
    browserDistribution,
    refresh: fetchData
  }
}
