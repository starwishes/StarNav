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
.head {
  --header-shell-bg: rgba(255, 255, 255, 0.78);
  --header-shell-bg-solid: rgba(255, 255, 255, 0.9);
  --header-shell-border: rgba(148, 163, 184, 0.22);
  --header-shell-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  --header-shell-shadow-scrolled: 0 18px 40px rgba(15, 23, 42, 0.16);
  --header-shell-inset: rgba(255, 255, 255, 0.56);
  --header-text: var(--ui-text-primary, #0f172a);
  --header-muted: rgba(15, 23, 42, 0.68);
  --header-divider: rgba(148, 163, 184, 0.24);
  --header-hover: rgba(var(--ui-theme-rgb), 0.1);
  --header-danger-hover: rgba(255, 69, 58, 0.12);
  --header-danger-text: #d33d32;
  position: fixed;
  top: 0;
  left: calc(var(--sidebar-width, 248px) + 16px);
  right: 24px;
  z-index: 1200;
  padding-top: 14px;
  color: var(--header-text);
  transition:
    left 0.35s ease,
    right 0.35s ease,
    padding-top 0.35s ease;
}

.head-shell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 66px;
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--header-shell-bg);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  border: 1px solid var(--header-shell-border);
  box-shadow:
    var(--header-shell-shadow),
    inset 0 1px 0 var(--header-shell-inset);
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease,
    transform 0.3s ease;
}

.utility-chip,
.admin-menu-item,
.sidebar-toggle-btn {
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
}

.utility-chip,
.admin-menu-item,
.sidebar-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 14px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: var(--header-hover);
    transform: translateY(-1px);
  }
}

.sidebar-toggle-btn {
  width: 44px;
  padding: 0;

  .iconfont {
    font-size: 22px;
  }
}

.clock-shell {
  padding: 0 12px;
  border-left: 1px solid var(--header-divider);
  border-right: 1px solid var(--header-divider);
}

.menu {
  list-style: none;
}

.menu-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--header-muted);
  cursor: pointer;
  font: inherit;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: var(--header-hover);
    color: var(--header-text);
    transform: translateY(-1px);
  }
}

.menu-label {
  font-size: 14px;
  font-weight: 500;
}

.admin-menu-item {
  .iconfont {
    font-size: 18px;
  }

  .admin-text {
    font-size: 14px;
    font-weight: 500;
  }
}

.logout-btn:hover {
  background: var(--header-danger-hover);
  color: var(--header-danger-text);
}

.theme-glyph {
  font-size: 16px;
  line-height: 1;
}

.flex-grow {
  flex-grow: 1;
}

.headsp {
  .head-shell {
    background: var(--header-shell-bg-solid);
    box-shadow:
      var(--header-shell-shadow-scrolled),
      inset 0 1px 0 var(--header-shell-inset);
    transform: translateY(-1px);
  }
}

:deep(.hs-clock .time) {
  width: auto;
  gap: 2px;

  span {
    width: auto;
    min-width: 24px;
    color: var(--header-text);
    font-size: 18px;
  }

  .text {
    color: var(--header-muted);
    margin: 0 2px;
  }
}

:global(:root[theme-mode='dark'] .head) {
  --header-shell-bg: rgba(4, 7, 12, 0.84);
  --header-shell-bg-solid: rgba(2, 4, 8, 0.94);
  --header-shell-border: rgba(255, 255, 255, 0.08);
  --header-shell-shadow: 0 16px 36px rgba(0, 0, 0, 0.32);
  --header-shell-shadow-scrolled: 0 22px 48px rgba(0, 0, 0, 0.44);
  --header-shell-inset: rgba(255, 255, 255, 0.08);
  --header-text: #f8fafc;
  --header-muted: rgba(226, 232, 240, 0.72);
  --header-divider: rgba(255, 255, 255, 0.12);
  --header-hover: rgba(255, 255, 255, 0.1);
  --header-danger-hover: rgba(255, 69, 58, 0.16);
  --header-danger-text: #ffb4ad;
}

@media screen and (max-width: 980px) {
  .head {
    right: 18px;
  }

  .clock-shell {
    display: none;
  }
}

@media screen and (max-width: 768px) {
  .head {
    left: 12px;
    right: 12px;
    padding-top: 10px;
  }

  .head-shell {
    min-height: 58px;
    padding: 8px 10px;
    gap: 8px;
  }

  .admin-menu-item .admin-text {
    display: none;
  }
}

@media screen and (max-width: 520px) {
  .utility-chip,
  .admin-menu-item {
    width: 40px;
    padding: 0;
  }

  .lang-toggle {
    margin-left: auto;
  }

  .theme-toggle {
    display: none;
  }
}

.translate-icon {
  font-size: 15px;
  font-weight: 500;
  color: inherit;

  sub {
    font-size: 11px;
    margin-left: 1px;
  }
}
</style>

