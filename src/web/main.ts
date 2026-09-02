import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import '@/assets/font/iconfont.css'
import '@/assets/css/base.css'
import '@/assets/css/content.scss'
import '@/assets/css/data-grid.scss'
import router from './router'
import { applyThemeMode, getStoredThemeMode } from '@/utils/theme'
import { clearStaleAssetRecoveryFlag, recoverFromStaleAssets } from '@/utils/staleAssetRecovery'
import {
  notifyStaleAssetReloadNeeded,
  notifyUnexpectedError
} from '@/utils/unexpectedErrorFeedback'
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
  logger.warn(
    'Detected a stale lazy-loaded asset (often after image rebuild). Recovering once.',
    event.payload
  )
  void recoverFromStaleAssets().then((result) => {
    if (result === 'skipped') {
      logger.error(
        'Stale asset recovery already attempted this session; stop reloading to avoid a loop.'
      )
      notifyStaleAssetReloadNeeded()
    }
  })
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
      // Poll for updates while the tab stays open (deploy while demo is open).
      if (registration) {
        window.setInterval(() => {
          void registration.update().catch(() => {})
        }, 60_000)
      }
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

// 全局错误兜底：Vue 渲染/生命周期错误与未处理的 Promise 拒绝都会进入这里，
// 记录日志并一次性提示用户（节流去重，避免 toast 风暴，见 unexpectedErrorFeedback）。
// vite:preloadError 的自愈逻辑（handlePreloadError）保持独立，不受影响。
const app = createApp(App)
app.config.errorHandler = (error, _instance, info) => {
  logger.error('Unhandled Vue error.', error, { info })
  notifyUnexpectedError()
}
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection.', event.reason)
  notifyUnexpectedError()
})

app.use(router).use(pinia).use(i18n).mount('#app')
// Successful boot: allow a future deploy to recover again this tab session.
window.setTimeout(() => clearStaleAssetRecoveryFlag(), 3_000)
