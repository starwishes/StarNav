<template>
  <header class="main-header">
    <div class="header-left">
      <button
        v-if="isMobile"
        type="button"
        class="header-button icon-button menu-toggle-btn"
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

const langIcon = computed(() => {
  return getLocale() === 'zh-CN' ? '文<sub>A</sub>' : 'A<sub>文</sub>'
})

const themeActionLabel = computed(() =>
  t(themeMode.value === 'dark' ? 'nav.switchToLight' : 'nav.switchToDark')
)

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

defineProps<{
  isMobile: boolean
  currentViewLabel: string
}>()

defineEmits(['open-sidebar', 'go-home'])

onMounted(() => {
  themeMode.value = applyThemeMode(getStoredThemeMode())
  syncThemeTokens(themeMode.value)
})
</script>

<style scoped lang="scss">
@use './AdminHeader.scss';
</style>

