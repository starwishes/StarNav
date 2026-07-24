import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const DistributionChartCard = (await import('@/components/admin/stats/DistributionChartCard.vue'))
  .default

describe('DistributionChartCard', () => {
  it('shows the empty label when distribution data is unavailable', () => {
    const wrapper = mount(DistributionChartCard, {
      props: {
        title: 'OS',
        totalLabel: 'Total',
        emptyLabel: 'No data',
        distribution: {
          total: 0,
          hasData: false,
          segments: []
        }
      }
    })

    expect(wrapper.find('.chart-empty').text()).toBe('No data')
  })

  it('renders a donut legend and formats percentages for multi-segment data', () => {
    const wrapper = mount(DistributionChartCard, {
      props: {
        title: 'OS',
        totalLabel: 'Total',
        emptyLabel: 'No data',
        distribution: {
          total: 12,
          hasData: true,
          segments: [
            { name: 'Linux', value: 9, percent: 75, color: '#000', path: 'M 1 1' },
            { name: 'Other', value: 3, percent: 2.5, color: '#111', path: 'M 2 2' }
          ]
        }
      }
    })

    expect(wrapper.find('.donut-total').text()).toBe('12')
    expect(wrapper.find('.donut-label').text()).toBe('Total')
    expect(wrapper.text()).toContain('Linux')
    expect(wrapper.text()).toContain('75%')
    expect(wrapper.text()).toContain('2.5%')
    expect(wrapper.findAll('path.donut-arc')).toHaveLength(2)
  })

  it('renders a full circle for single-segment distributions', () => {
    const wrapper = mount(DistributionChartCard, {
      props: {
        title: 'Browser',
        totalLabel: 'Total',
        emptyLabel: 'No data',
        distribution: {
          total: 5,
          hasData: true,
          segments: [{ name: 'Firefox', value: 5, percent: 100, color: '#f60', path: 'M 0 0' }]
        }
      }
    })

    expect(wrapper.findAll('circle.donut-arc')).toHaveLength(1)
    expect(wrapper.text()).toContain('Firefox')
    expect(wrapper.text()).toContain('100%')
  })
})
