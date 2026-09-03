import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  routes: [] as any[],
  beforeHook: null as any,
  titleRefreshHandler: null as any,
  siteName: 'StarNav',
  currentRoute: { meta: { titleKey: 'nav.admin' } } as any
}))

vi.mock('vue-router', () => ({
  createWebHistory: vi.fn(() => 'history'),
  createRouter: vi.fn((options) => {
    state.routes = options.routes
    return {
      beforeEach: (hook: unknown) => {
        state.beforeHook = hook
      },
      currentRoute: { value: state.currentRoute }
    }
  })
}))

vi.mock('@/plugins/i18n', () => ({
  default: {
    global: {
      t: (key: string) => `translated:${key}`
    }
  },
  registerTitleRefreshHandler: (handler: unknown) => {
    state.titleRefreshHandler = handler
  }
}))

vi.mock('@/store/config', () => ({
  useConfigStore: () => ({
    displaySiteName: state.siteName
  })
}))

const loadRouterModule = async () => {
  vi.resetModules()
  return import('../../../src/web/router/index.ts')
}

describe('router bootstrap', () => {
  beforeEach(() => {
    state.routes = []
    state.beforeHook = null
    state.titleRefreshHandler = null
    state.siteName = 'StarNav'
    document.title = ''
    localStorage.clear()
  })

  it('registers core routes and updates page title', async () => {
    localStorage.setItem('admin_user', JSON.stringify({ username: 'admin', level: 3 }))
    await loadRouterModule()

    expect(state.routes.map((route) => route.path)).toEqual([
      '/',
      '/admin',
      '/admin/dashboard',
      '/admin/dashboard/:view(data|users|settings|monitor)'
    ])
    expect(state.routes[2].meta).toEqual(
      expect.objectContaining({ titleKey: 'nav.admin', requiresAdmin: true })
    )
    expect(state.routes[3].meta).toEqual(
      expect.objectContaining({ titleKey: 'nav.admin', requiresAdmin: true })
    )

    const next = vi.fn()
    state.beforeHook({ meta: { titleKey: 'nav.admin' } }, {}, next)
    expect(document.title).toBe('translated:nav.admin - StarNav')
    expect(next).toHaveBeenCalledTimes(1)

    state.beforeHook({ meta: {} }, {}, next)
    expect(document.title).toBe('StarNav')
  })

  it('recomputes the page title for the current route when locale changes', async () => {
    // 导航后标题已更新；语言切换走 i18n 注册的刷新回调按当前路由重算（模拟 setLocale 触发）
    await loadRouterModule()
    const next = vi.fn()
    state.beforeHook({ meta: { titleKey: 'nav.admin' } }, {}, next)
    expect(document.title).toBe('translated:nav.admin - StarNav')

    document.title = ''
    expect(state.titleRefreshHandler).toBeTypeOf('function')
    state.titleRefreshHandler()
    expect(document.title).toBe('translated:nav.admin - StarNav')
  })

  it('redirects non-admin visitors away from protected admin routes', async () => {
    await loadRouterModule()

    const next = vi.fn()
    state.beforeHook(
      { fullPath: '/admin/dashboard', meta: { titleKey: 'nav.admin', requiresAdmin: true } },
      {},
      next
    )

    expect(next).toHaveBeenCalledWith({
      path: '/',
      query: { login: '1', redirect: '/admin/dashboard' }
    })
  })
})
