import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const TrendChartCard = (await import('@/components/admin/stats/TrendChartCard.vue')).default

describe('TrendChartCard', () => {
  it('shows the empty label when no chart data is available', () => {
    const wrapper = mount(TrendChartCard, {
      props: {
        title: 'Visits',
        emptyLabel: 'No data',
        chartData: {
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
        }
      }
    })

    expect(wrapper.find('.chart-empty').text()).toBe('No data')
  })

  it('renders legend, axis labels, points, and line paths when chart data exists', () => {
    const wrapper = mount(TrendChartCard, {
      props: {
        title: 'Visits',
        emptyLabel: 'No data',
        chartData: {
          hasData: true,
          width: 640,
          height: 280,
          padding: { top: 20, right: 22, bottom: 34, left: 44 },
          yTicks: [
            { value: 10, y: 20 },
            { value: 5, y: 120 }
          ],
          points: [
            { label: '04-12', x: 44, pvY: 70, uvY: 90, pv: 6, uv: 4 },
            { label: '04-13', x: 120, pvY: 40, uvY: 60, pv: 10, uv: 7 }
          ],
          pvLinePath: 'M 44 70 L 120 40',
          uvLinePath: 'M 44 90 L 120 60',
          pvAreaPath: 'M 44 70 L 120 40 Z',
          uvAreaPath: 'M 44 90 L 120 60 Z'
        }
      }
    })

    expect(wrapper.text()).toContain('PV')
    expect(wrapper.text()).toContain('UV')
    expect(wrapper.text()).toContain('04-12')
    expect(wrapper.text()).toContain('04-13')
    expect(wrapper.text()).toContain('10')
    expect(wrapper.findAll('.chart-line')).toHaveLength(2)
    expect(wrapper.findAll('.chart-point')).toHaveLength(4)
    expect(wrapper.findAll('.chart-grid-line')).toHaveLength(2)
  })
})
