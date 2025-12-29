import { createRouter, createWebHistory, RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import i18n from '@/plugins/i18n'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Index',
    component: () => import('@/views/Index/index.vue'),
    meta: {} // Homepage defaults to site name
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('@/views/AdminDashboard.vue'),
    meta: { titleKey: 'nav.admin' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

import { useMainStore } from '@/store'

router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const t = i18n.global.t;
  const store = useMainStore();
  const siteName = store.settings.siteName || t('notification.siteName');

  if (to.meta.titleKey) {
    document.title = `${t(to.meta.titleKey as string)} - ${siteName}`;
  } else {
    document.title = siteName;
  }
  next();
});

// @ts-ignore
import { recordVisit } from '@/api/stats';
router.afterEach((to) => {
  recordVisit(to.fullPath);
});

export default router
