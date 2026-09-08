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
import { ElMessageBox } from '@/utils/feedback'

import { createPinia } from 'pinia'
import i18n from '@/plugins/i18n'

const pinia = createPinia()
const LEGACY_TOKEN_STORAGE_KEY = 'admin_token'
const logger = createScopedLogger('web:bootstrap')
// pre-mount i18n：SW 刷新提示发生在 app.use(i18n) 之前，直接用实例的 t()
const t = i18n.global.t

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
  // 首访的"接管"不是"被替换"：clientsClaim:true 下全新访客首次安装时，新 SW 激活并
  // claim 页面也会触发一次 controllerchange，此时整页 reload 是多余的（页面本就用着
  // 这份代码）。只有页面在注册时已有 controller（快照非空），controllerchange 才
  // 意味着"旧控制器被新版本替换"。无 controller 的页面跳过首个 controllerchange
  // （首次 claim），其后任何 controllerchange（后续部署经确认激活）照常 reload。
  const wasInitiallyControlled = Boolean(navigator.serviceWorker.controller)
  let initialControllerChangeHandled = wasInitiallyControlled
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isReloadingForServiceWorker) {
      return
    }

    if (!initialControllerChangeHandled) {
      // 首次 claim：记录已接管但跳过本次多余 reload
      initialControllerChangeHandled = true
      logger.info('A service worker claimed this page for the first time; skipping reload.')
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
      // 第 33 轮：检测到新版本后不再直接 updateServiceWorker(true) 自动激活刷新
      //（旧 autoUpdate 模式会在编辑中途静默 reload，丢未保存输入），改为弹确认框，
      // 用户确认后才 messageSkipWaiting 激活；新 SW 接管页面后由下方 controllerchange
      // 监听统一 reload。用户取消则本次不激活，下一个部署再重新提示。
      // 注意：若用户在另一标签页确认，本页仍会因 controllerchange 自动刷新
      // （跨标签页无法拦截确认，属已知取舍，见台账）。
      logger.info('Detected a fresh service worker version, waiting for user confirmation.')
      ElMessageBox.confirm(t('feedback.newVersionMessage'), t('feedback.newVersionReady'), {
        confirmButtonText: t('feedback.refreshNow'),
        cancelButtonText: t('feedback.cancel'),
        type: 'info'
      })
        .then(() => {
          logger.info('User confirmed service worker refresh, activating it now.')
          void updateServiceWorker(true)
        })
        .catch(() => {
          logger.info('User postponed the service worker refresh.')
        })
    },
    onRegisterError(error) {
      logger.error('Failed to register the service worker.', error)
    }
  })
}

applyThemeMode(getStoredThemeMode())
window.addEventListener('vite:preloadError', handlePreloadError)
registerServiceWorker()
// 清理旧版 JWT 残留。站点数据被禁用时 localStorage 访问会抛 SecurityError，
// 该清理非必需，静默跳过（第 34 轮盲审 L5 bootstrap 无守卫同族）。
try {
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY)
} catch {
  // ignore: storage unavailable
}

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
