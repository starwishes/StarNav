import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSystemHealth: vi.fn()
}))

vi.mock('@/api/admin', () => ({
  adminApi: {
    getSystemHealth: mocks.getSystemHealth
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        ({
          'health.uptimeDayUnit': 'd',
          'health.uptimeHourUnit': 'h',
          'health.uptimeMinuteUnit': 'm'
        }) as Record<string, string>
      )[key] || `translated:${key}`
  })
}))

const SystemHealth = (await import('@/components/admin/SystemHealth.vue')).default

describe('SystemHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads health data on mount and renders the formatted metrics', async () => {
    mocks.getSystemHealth.mockResolvedValue({
      status: 'healthy',
      version: '1.0.0',
      timestamp: '2026-04-13T10:00:00.000Z',
      checks: {
        uptime: 93784,
        memory: {
          rss: '128 MB',
          heapUsed: '64 MB',
          heapTotal: '96 MB'
        },
        database: {
          ok: true,
          size: 2048,
          tables: 12,
          quickCheck: 'ok',
          journalMode: 'wal',
          writable: true
        },
        cache: {
          hits: 100,
          misses: 4,
          keys: 12
        },
        runtime: {
          nodeEnv: 'production',
          authCookieSecureMode: 'auto',
          cspUpgradeInsecureRequests: false,
          corsOriginsConfigured: true,
          dataDir: '/data',
          uploadsDir: '/data/uploads'
        }
      }
    })

    const wrapper = mount(SystemHealth, {
      global: {
        stubs: {
          AppIcon: true
        }
      }
    })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(mocks.getSystemHealth).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('translated:health.healthy')
    expect(wrapper.text()).toContain('translated:health.dbConnected')
    expect(wrapper.text()).toContain('v1.0.0')
    expect(wrapper.text()).toContain('1d 2h 3m')
    expect(wrapper.text()).toContain('2 KB')
    expect(wrapper.text()).toContain('100 / 4')
    expect(wrapper.text()).toContain('translated:health.runtimeCookieAuto')
    expect(wrapper.find('.refresh-button').attributes('aria-label')).toBe(
      'translated:health.refresh'
    )
    expect(wrapper.find('.refresh-button').attributes('title')).toBe('translated:health.refresh')
  })

  it('refreshes health data when the refresh button is clicked', async () => {
    mocks.getSystemHealth.mockResolvedValue({
      status: 'degraded',
      version: '2.2.8',
      timestamp: '2026-04-13T10:00:00.000Z',
      checks: {
        uptime: 60,
        memory: {
          rss: '128 MB',
          heapUsed: '64 MB',
          heapTotal: '96 MB'
        },
        database: {
          ok: false,
          size: 1024,
          tables: 10,
          quickCheck: 'failed',
          journalMode: 'delete',
          writable: false,
          error: 'database unavailable'
        },
        cache: {
          hits: 10,
          misses: 2,
          keys: 4
        },
        runtime: {
          nodeEnv: 'production',
          authCookieSecureMode: 'never',
          cspUpgradeInsecureRequests: true,
          corsOriginsConfigured: false,
          dataDir: '/data',
          uploadsDir: '/data/uploads'
        }
      }
    })

    const wrapper = mount(SystemHealth, {
      global: {
        stubs: {
          AppIcon: true
        }
      }
    })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    await wrapper.find('.refresh-button').trigger('click')
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(mocks.getSystemHealth).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('translated:health.degraded')
    expect(wrapper.text()).toContain('translated:health.dbDisconnected')
    expect(wrapper.text()).toContain('database unavailable')
  })

  it('shows an error state with retry when health loading fails', async () => {
    mocks.getSystemHealth.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(SystemHealth, {
      global: {
        stubs: {
          AppIcon: true
        }
      }
    })
    await Promise.resolve()
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // 失败时不再无限停留在骨架屏：渲染错误态 + 重试按钮。
    expect(wrapper.find('.skeleton-grid').exists()).toBe(false)
    expect(wrapper.find('.error-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('translated:health.loadFailed')
    expect(wrapper.text()).toContain('translated:common.retry')

    // 重试成功后回到正常内容
    mocks.getSystemHealth.mockResolvedValue({
      status: 'healthy',
      version: '1.0.0',
      timestamp: '2026-04-13T10:00:00.000Z',
      checks: {
        uptime: 10,
        memory: { rss: '1 MB', heapUsed: '1 MB', heapTotal: '2 MB' },
        database: {
          ok: true,
          size: 1,
          tables: 1,
          quickCheck: 'ok',
          journalMode: 'wal',
          writable: true
        },
        cache: { hits: 0, misses: 0, keys: 0 },
        runtime: {
          nodeEnv: 'production',
          authCookieSecureMode: 'auto',
          cspUpgradeInsecureRequests: false,
          corsOriginsConfigured: false
        }
      }
    })
    await wrapper.find('.error-retry').trigger('click')
    await Promise.resolve()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.error-card').exists()).toBe(false)
    expect(wrapper.text()).toContain('translated:health.healthy')
  })
})
