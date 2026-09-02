<template>
  <header class="main-header">
    <div class="header-left">
      <button
        v-if="isMobile"
        type="button"
        class="header-button icon-button menu-toggle-btn"
        :aria-label="t('admin.toggleSidebar')"
        :aria-expanded="sidebarOpen"
        aria-controls="admin-sidebar"
        @click="$emit('open-sidebar')"
      >
        <AppIcon name="icon-md-menu" class="button-icon" />
      </button>
      <div class="title-area">
        <h2 class="view-title">{{ currentViewLabel }}</h2>
      </div>
    </div>
    <div class="header-actions">
      <button type="button" class="header-button hover-scale lang-btn" @click="toggleLang">
        <span v-html="langIcon"></span>
      </button>

      <button
        type="button"
        class="header-button hover-scale theme-btn"
        :title="themeActionLabel"
        :aria-label="themeActionLabel"
        @click="toggleTheme"
      >
        <span class="theme-glyph">{{ themeMode === 'dark' ? '◐' : '◑' }}</span>
      </button>

      <button type="button" class="header-button hover-scale action-btn" @click="$emit('go-home')">
        <AppIcon name="icon-md-home" class="button-icon" />
        <span class="btn-text">{{ t('nav.home') }}</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { useI18n } from 'vue-i18n'
import { getLocale, setLocale } from '@/plugins/i18n'
import { buildLangIconHtml } from '@/utils/langIcon'
import { ElMessage } from '@/utils/feedback'
import { computed, onMounted, ref } from 'vue'
import {
  applyThemeMode,
  applyThemeTokens,
  getStoredThemeMode,
  resolveThemeTokens,
  toggleThemeMode,
  type ThemeMode
} from '@/utils/theme'

const { t } = useI18n()
const themeMode = ref<ThemeMode>('light')

const langIcon = computed(() => buildLangIconHtml(getLocale()))

const themeActionLabel = computed(() =>
  t(themeMode.value === 'dark' ? 'nav.switchToLight' : 'nav.switchToDark')
)

const toggleLang = () => {
  const newLang = getLocale() === 'zh-CN' ? 'en-US' : 'zh-CN'
  setLocale(newLang)
  ElMessage.success(t('common.languageSwitched'))
}

const syncThemeTokens = (mode: ThemeMode) => {
  applyThemeTokens(resolveThemeTokens(mode))
}

const toggleTheme = () => {
  themeMode.value = toggleThemeMode(themeMode.value)
  syncThemeTokens(themeMode.value)
}

defineProps<{
  isMobile: boolean
  currentViewLabel: string
  sidebarOpen?: boolean
}>()

defineEmits(['open-sidebar', 'go-home'])

onMounted(() => {
  themeMode.value = applyThemeMode(getStoredThemeMode())
  syncThemeTokens(themeMode.value)
})
</script>

<style scoped lang="scss">
.main-header {
  --admin-header-bg: color-mix(
    in srgb,
    var(--ui-panel-bg, rgba(255, 255, 255, 0.82)) 88%,
    rgba(var(--ui-theme-rgb), 0.16) 12%
  );
  --admin-header-border: color-mix(
    in srgb,
    var(--ui-panel-border, rgba(29, 29, 31, 0.08)) 78%,
    rgba(var(--ui-theme-rgb), 0.22) 22%
  );
  --admin-header-shadow:
    0 18px 36px rgba(var(--ui-theme-rgb), 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.38);
  --admin-header-text: var(--ui-text-primary, #1d1d1f);
  --admin-header-muted: var(--ui-text-muted, rgba(29, 29, 31, 0.68));
  --admin-header-divider: color-mix(
    in srgb,
    var(--ui-text-muted, rgba(29, 29, 31, 0.68)) 44%,
    transparent
  );
  --admin-header-button-bg: rgba(var(--ui-theme-rgb), 0.08);
  --admin-header-button-border: rgba(var(--ui-theme-rgb), 0.14);
  --admin-header-button-text: var(--ui-text-primary, #1d1d1f);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px 10px 16px;
  border-radius: 999px;
  background: var(--admin-header-bg);
  border: 1px solid var(--admin-header-border);
  backdrop-filter: saturate(180%) blur(20px);
  box-shadow: var(--admin-header-shadow);
  color: var(--admin-header-text);
}

:global(:root[data-theme-preset='cinema'] .main-header) {
  --admin-header-bg: rgba(10, 10, 12, 0.78);
  --admin-header-border: rgba(255, 255, 255, 0.1);
  --admin-header-shadow: 0 18px 36px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --admin-header-text: #f5f5f7;
  --admin-header-muted: rgba(255, 255, 255, 0.62);
  --admin-header-divider: rgba(255, 255, 255, 0.24);
  --admin-header-button-bg: rgba(255, 255, 255, 0.08);
  --admin-header-button-border: rgba(255, 255, 255, 0.12);
  --admin-header-button-text: rgba(255, 255, 255, 0.88);
}

:global(:root[theme-mode='dark'] .main-header) {
  --admin-header-bg: rgba(4, 7, 12, 0.88);
  --admin-header-border: rgba(255, 255, 255, 0.08);
  --admin-header-shadow: 0 22px 44px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  --admin-header-text: #f8fafc;
  --admin-header-muted: rgba(226, 232, 240, 0.66);
  --admin-header-divider: rgba(255, 255, 255, 0.14);
  --admin-header-button-bg: rgba(255, 255, 255, 0.06);
  --admin-header-button-border: rgba(255, 255, 255, 0.1);
  --admin-header-button-text: #f8fafc;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
}

.title-area {
  min-width: 0;
}

.view-title {
  margin: 0;
  font-family: var(--ui-font-display);
  font-size: clamp(18px, 2vw, 22px);
  line-height: 1.15;
  font-weight: 600;
  letter-spacing: -0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.header-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  min-width: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--admin-header-button-border);
  background: var(--admin-header-button-bg);
  color: var(--admin-header-button-text);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: rgba(var(--ui-theme-rgb), 0.14);
    border-color: rgba(var(--ui-theme-rgb), 0.24);
    box-shadow: 0 10px 20px rgba(var(--ui-theme-rgb), 0.12);
  }
}

.hover-scale:hover:not(:disabled) {
  transform: translateY(-1px);
}

.lang-btn {
  min-width: 36px;
  padding: 0 10px;

  :deep(sub) {
    font-size: 0.65em;
  }
}

.theme-btn {
  min-width: 36px;
  padding: 0 10px;
}

.action-btn {
  min-width: 36px;
}

.button-icon {
  width: 15px;
  height: 15px;
}

.theme-glyph {
  font-size: 15px;
  line-height: 1;
}

@media screen and (max-width: 768px) {
  .main-header {
    padding: 8px 12px;
    border-radius: 22px;
    gap: 8px;
  }

  .view-title {
    font-size: 17px;
  }

  .breadcrumb-trail {
    display: none;
  }

  .header-actions {
    flex-shrink: 0;
    justify-content: flex-end;
  }

  .btn-text {
    display: none;
  }

  .header-button {
    min-width: 34px;
    min-height: 34px;
    padding: 0 10px;
  }
}

@keyframes spin {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
