import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  RouteLocationNormalized,
  NavigationGuardNext
} from 'vue-router'
import i18n from '@/plugins/i18n'

const readStoredAdminUser = () => {
  // 注意：这里的 admin_user 仅来自 localStorage（客户端可任意篡改），
  // 因此本路由守卫只是 UX 层面的引导——让未登录/权限不足的用户看到登录弹窗；
  // 真正的授权由服务端 authenticate/requireAdmin 中间件在每个 API 上强制执行。
  try {
    const raw = localStorage.getItem('admin_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Index',
    component: () => import('@/views/Index/index.vue'),
    meta: {} // Homepage defaults to site name
  },
  {
    // Common typo / shortcut; always land on the real admin route.
    path: '/admin',
    redirect: '/admin/dashboard'
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('@/views/AdminDashboard.vue'),
    meta: { titleKey: 'nav.admin', requiresAdmin: true }
  },
  {
    path: '/admin/dashboard/:view(data|users|settings|monitor)',
    name: 'AdminDashboardView',
    component: () => import('@/views/AdminDashboard.vue'),
    meta: { titleKey: 'nav.admin', requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

import { useConfigStore } from '@/store/config'

router.beforeEach(
  (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    const t = i18n.global.t
    const configStore = useConfigStore()
    const siteName = configStore.displaySiteName
    const currentUser = readStoredAdminUser()

    if (to.meta.requiresAdmin && (!currentUser || Number(currentUser.level) !== 3)) {
      // Send home with a flag so the header can open the login dialog.
      // 前端守卫仅为 UX，服务端才是真授权：所有管理接口仍有 requireAdmin 保护。
      next({ path: '/', query: { login: '1', redirect: to.fullPath } })
      return
    }

    if (to.meta.titleKey) {
      const pageTitle = t(to.meta.titleKey as string)
      document.title = `${pageTitle} - ${siteName}`
    } else {
      document.title = siteName
    }
    next()
  }
)

import { recordVisit } from '@/api/stats'
router.afterEach((to) => {
  void Promise.resolve(recordVisit(to.fullPath)).catch(() => {})
})

export default router
