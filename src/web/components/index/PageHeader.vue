<template>
  <div class="head" :class="{ headsp: change }">
    <div class="head-shell">
      <button type="button" class="sidebar-toggle-btn utility-chip" @click="toggleSidebar">
        <i class="iconfont icon-md-menu"></i>
      </button>

      <ul class="menu">
        <li>
          <button type="button" class="menu-item" @click="handleHomeClick">
            <i class="iconfont icon-md-home"></i>
            <span class="menu-label">{{ t('nav.home') }}</span>
          </button>
        </li>
      </ul>

      <div class="clock-shell">
        <Clock class="clock-component"></Clock>
      </div>

      <div class="flex-grow" />

      <button type="button" class="utility-chip lang-toggle" @click="toggleLang">
        <span class="translate-icon" v-html="langIcon"></span>
      </button>

      <button type="button" class="utility-chip theme-toggle" @click="toggleTheme">
        <span class="theme-glyph">{{ themeMode === 'dark' ? '◐' : '◑' }}</span>
      </button>

      <template v-if="adminStore.isAuthenticated">
        <button
          v-if="adminStore.user?.level === 3"
          type="button"
          class="admin-menu-item utility-chip"
          @click="goToAdmin"
        >
          <i class="iconfont icon-md-lock"></i>
          <span class="admin-text">{{ t('nav.admin') }}</span>
        </button>
        <button type="button" class="admin-menu-item utility-chip logout-btn" @click="handleLogout">
          <i class="iconfont icon-md-log-out"></i>
          <span class="admin-text">{{ t('nav.logout') }}</span>
        </button>
      </template>
      <template v-else>
        <button type="button" class="admin-menu-item utility-chip" @click="showLoginDialog = true">
          <i class="iconfont icon-md-contact"></i>
          <span class="admin-text">{{ t('nav.login') }}</span>
        </button>
      </template>
    </div>
  </div>
  <LoginDialog v-model="showLoginDialog" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getLocale, setLocale } from '@/plugins/i18n'
import Clock from './Clock.vue'
import LoginDialog from '@/components/admin/LoginDialog.vue'
import { useConfigStore } from '@/store/config'
import { useAdminStore } from '@/store/admin'
import { ElMessage } from '@/utils/feedback'
import {
  applyThemeMode,
  applyThemeTokens,
  getStoredThemeMode,
  resolveThemeTokens,
  toggleThemeMode,
  type ThemeMode
} from '@/utils/theme'
import { isSafeHttpUrl, isSafeRelativePath } from '../../../shared/security/urlSafety.js'
import { createScopedLogger } from '../../../shared/logger.js'

const { t } = useI18n()
const logger = createScopedLogger('web:page-header')

const toggleSidebar = inject<() => void>('toggleSidebar', () => {})

const change = ref(false)
const configStore = useConfigStore()
const router = useRouter()
const route = useRoute()
const adminStore = useAdminStore()
const scrollHeight = ref(0)
const showLoginDialog = ref(false)
const themeMode = ref<ThemeMode>('light')

// Open login when guard bounced unauthenticated users from /admin/*
watch(
  () => route.query.login,
  (loginFlag) => {
    if (loginFlag === '1' && !adminStore.isAuthenticated) {
      showLoginDialog.value = true
    }
  },
  { immediate: true }
)

const langIcon = computed(() => {
  return getLocale() === 'zh-CN' ? '文<sub>A</sub>' : 'A<sub>文</sub>'
})

const toggleLang = () => {
  const newLang = getLocale() === 'zh-CN' ? 'en-US' : 'zh-CN'
  setLocale(newLang)
  ElMessage.success(newLang === 'zh-CN' ? '已切换至中文' : 'Switched to English')
}

const syncThemeTokens = (mode: ThemeMode) => {
  applyThemeTokens(resolveThemeTokens(mode))
}

const toggleTheme = () => {
  themeMode.value = toggleThemeMode(themeMode.value)
  syncThemeTokens(themeMode.value)
}

const goToAdmin = async () => {
  if (adminStore.user?.level !== 3) {
    return
  }

  try {
    await router.push('/admin/dashboard')
  } catch (error) {
    logger.warn('Falling back to a hard reload for admin navigation.', error)
    window.location.assign('/admin/dashboard')
  }
}

const handleHomeClick = () => {
  const homeUrl = configStore.siteConfig.homeUrl

  if (isSafeHttpUrl(homeUrl)) {
    window.location.href = homeUrl
  } else if (isSafeRelativePath(homeUrl)) {
    router.push(homeUrl)
  } else if (router.currentRoute.value.path === '/') {
    window.location.reload()
  } else {
    router.push('/')
  }
}

const handleLogout = async () => {
  await adminStore.logout()
  ElMessage.success(t('auth.logoutSuccess'))
}

const handleScroll = () => {
  scrollHeight.value = window.scrollY
  change.value = scrollHeight.value > 30
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  themeMode.value = applyThemeMode(getStoredThemeMode())
  syncThemeTokens(themeMode.value)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped lang="scss">
@use './PageHeader.scss';
</style>

