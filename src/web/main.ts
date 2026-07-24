import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import '@/assets/font/iconfont.css'
import '@/assets/css/base.css'
import '@/assets/css/content.scss'
import '@/assets/css/data-grid.scss'
import router from './router'
import { applyThemeMode, getStoredThemeMode } from '@/utils/theme'
import { createScopedLogger } from '../shared/logger.js'

import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import i18n from '@/plugins/i18n'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const LEGACY_TOKEN_STORAGE_KEY = 'admin_token'
const logger = createScopedLogger('web:bootstrap')

const handlePreloadError = (event: VitePreloadErrorEvent) => {
  event.preventDefault()
  logger.warn('Detected a stale lazy-loaded asset, reloading the page.', event.payload)
  window.location.reload()
}

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  let isReloadingForServiceWorker = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isReloadingForServiceWorker) {
      return
    }

    isReloadingForServiceWorker = true
    logger.info('A new service worker took control, reloading the page.')
    window.location.reload()
  })

  const updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      logger.info('Registered service worker.', { swUrl })
      void registration?.update().catch((error) => {
        logger.warn('Failed to force an immediate service worker update check.', error)
      })
    },
    onNeedRefresh() {
      logger.info('Detected a fresh service worker version, activating it now.')
      void updateServiceWorker(true)
    },
    onRegisterError(error) {
      logger.error('Failed to register the service worker.', error)
    }
  })
}

applyThemeMode(getStoredThemeMode())
window.addEventListener('vite:preloadError', handlePreloadError)
registerServiceWorker()
localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY)

// 挂载Vue应用
createApp(App).use(router).use(pinia).use(i18n).mount('#app')
