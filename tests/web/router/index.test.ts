import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  routes: [] as any[],
  beforeHook: null as any,
  afterHook: null as any,
  recordVisit: vi.fn(),
  siteName: 'StarNav'
}))

vi.mock('vue-router', () => ({
  createWebHistory: vi.fn(() => 'history'),
  createRouter: vi.fn((options) => {
    state.routes = options.routes
    return {
      beforeEach: (hook: unknown) => {
        state.beforeHook = hook
      },
      afterEach: (hook: unknown) => {
        state.afterHook = hook
      }
    }
  })
}))

vi.mock('@/plugins/i18n', () => ({
  default: {
    global: {
      t: (key: string) => `translated:${key}`
    }
  }
}))

vi.mock('@/store/config', () => ({
  useConfigStore: () => ({
    displaySiteName: state.siteName
  })
}))

vi.mock('@/api/stats', () => ({
  recordVisit: state.recordVisit
}))

const loadRouterModule = async () => {
  vi.resetModules()
  return import('../../../src/web/router/index.ts')
}

describe('router bootstrap', () => {
  beforeEach(() => {
    state.routes = []
    state.beforeHook = null
    state.afterHook = null
    state.siteName = 'StarNav'
    state.recordVisit.mockReset()
    document.title = ''
    localStorage.clear()
  })

  it('registers core routes and updates page title plus visit tracking hooks', async () => {
    localStorage.setItem('admin_user', JSON.stringify({ username: 'admin', level: 3 }))
    await loadRouterModule()

    expect(state.routes.map((route) => route.path)).toEqual(['/', '/admin/dashboard'])
    expect(state.routes[1].meta).toEqual(
      expect.objectContaining({ titleKey: 'nav.admin', requiresAdmin: true })
    )

    const next = vi.fn()
    state.beforeHook({ meta: { titleKey: 'nav.admin' } }, {}, next)
    expect(document.title).toBe('translated:nav.admin - StarNav')
    expect(next).toHaveBeenCalledTimes(1)

    state.beforeHook({ meta: {} }, {}, next)
    expect(document.title).toBe('StarNav')

    state.afterHook({ fullPath: '/admin/dashboard' })
    expect(state.recordVisit).toHaveBeenCalledWith('/admin/dashboard')
  })

  it('redirects non-admin visitors away from protected admin routes', async () => {
    await loadRouterModule()

    const next = vi.fn()
    state.beforeHook({ meta: { titleKey: 'nav.admin', requiresAdmin: true } }, {}, next)

    expect(next).toHaveBeenCalledWith('/')
  })
})
