<template>
  <div
    class="site-card-wrapper"
    @click="handleClick"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <a
      class="inherit-text"
      :class="{ 'is-disabled': selectionMode }"
      :href="getSafeHref(item.url)"
      target="_blank"
      rel="noopener noreferrer"
      :role="selectionMode ? 'checkbox' : undefined"
      :aria-checked="selectionMode ? selected : undefined"
      @click.prevent="!selectionMode && $emit('click', $event)"
      @auxclick="handleAuxClick"
      @touchstart="!selectionMode && $emit('touchstart', $event)"
    >
      <div
        class="site-card"
        :class="{
          'is-pinned': item.pinned,
          'is-selected': selected,
          'selection-mode': selectionMode
        }"
      >
        <div class="img-group">
          <img
            v-if="currentIconSrc && isRenderableIconUrl(currentIconSrc)"
            :src="currentIconSrc"
            class="site-icon"
            alt=""
            loading="lazy"
            @error="handleIconError"
          />
          <div v-else class="site-icon-placeholder">
            {{ item.name?.trim()?.charAt(0)?.toUpperCase() || '?' }}
          </div>
        </div>

        <div class="text-group">
          <div class="site-name text">{{ item.name }}</div>
          <div class="site-desc text">{{ item.description }}</div>
        </div>

        <div v-if="item.pinned" class="pin-badge" aria-hidden="true">📌</div>
        <span v-if="item.pinned" class="sr-only">{{ t('site.pinnedBadge') }}</span>

        <div v-if="selectionMode" class="selection-checkbox">
          <div class="checkbox-inner" :class="{ checked: selected }">
            <AppIcon v-if="selected" name="icon-md-checkmark" class="selection-check-icon" />
          </div>
        </div>
      </div>
    </a>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Item } from '@/types'
import { isSafeHttpUrl, isSafeRelativePath } from '@common/security/urlSafety'
import { buildIconCandidates, isRenderableIconUrl, markIconUnavailable } from './siteIconHelpers'

const { t } = useI18n()

const props = defineProps<{
  item: Item
  faviconUrl?: string
  fallbackFaviconUrl?: string
  selectionMode?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
  (e: 'contextmenu', event: MouseEvent): void
  (e: 'touchstart', event: TouchEvent): void
  (e: 'toggle-select'): void
}>()

const handleClick = (e: MouseEvent) => {
  if (props.selectionMode) {
    e.preventDefault()
    e.stopPropagation()
    emit('toggle-select')
  }
}

// 选择模式下中键（auxclick）会直接在新标签打开书签，绕过选择流程：
// 仅在选择模式拦截，正常模式保留浏览器“中键新标签打开”的原生行为。
const handleAuxClick = (e: MouseEvent) => {
  if (props.selectionMode) {
    e.preventDefault()
    e.stopPropagation()
  }
}

// 书签 URL 可能被篡改为危险协议：渲染层 href 一律用安全化结果，
// 实际跳转由父级 openUrl()（同样做协议校验）执行。
const getSafeHref = (url: string) =>
  isSafeHttpUrl(url) || isSafeRelativePath(url) ? url : undefined

const iconIndex = ref(0)

const iconCandidates = computed(() =>
  buildIconCandidates(props.item?.url || '', props.faviconUrl || '', props.fallbackFaviconUrl || '')
)

const currentIconSrc = computed(() => iconCandidates.value[iconIndex.value] || '')

const resetIconState = () => {
  iconIndex.value = 0
}

const handleIconError = () => {
  if (iconIndex.value < iconCandidates.value.length - 1) {
    iconIndex.value += 1
    return
  }

  if (iconCandidates.value.length > 0) {
    markIconUnavailable(
      props.item?.url || '',
      props.faviconUrl || '',
      props.fallbackFaviconUrl || ''
    )
  }

  iconIndex.value = iconCandidates.value.length
}

watch(
  () => [props.item?.id, props.item?.url, props.faviconUrl, props.fallbackFaviconUrl],
  resetIconState,
  { immediate: true }
)
</script>

<style scoped lang="scss">
.site-card-wrapper {
  display: block;
  width: 100%;
  min-width: 0;
}

.site-card {
  --card-bg: var(--category-card-bg, #ffffff);
  --card-border: var(--category-card-border, rgba(29, 29, 31, 0.1));
  --card-text: var(--category-card-text, #1d1d1f);
  --card-muted: var(--category-card-muted, rgba(29, 29, 31, 0.72));
  --card-icon-bg: var(--category-icon-bg, rgba(29, 29, 31, 0.05));
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-width: 0;
  min-height: 120px;
  padding: 20px;
  border-radius: 20px;
  overflow: hidden;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  box-shadow: none;
  user-select: none;
  -webkit-user-select: none;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(var(--ui-theme-rgb), 0.28);
  }

  &.is-pinned {
    border-color: rgba(var(--ui-theme-rgb), 0.36);
    box-shadow: inset 0 0 0 1px rgba(var(--ui-theme-rgb), 0.16);
  }

  &.is-selected {
    background: linear-gradient(180deg, rgba(var(--ui-theme-rgb), 0.12), var(--card-bg));
    border-color: rgba(var(--ui-theme-rgb), 0.36);
    transform: scale(0.985);
  }

  &.selection-mode {
    cursor: pointer;

    &:hover {
      transform: none;
    }
  }
}

.img-group {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: var(--card-icon-bg);
  overflow: hidden;
}

.site-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.site-icon-placeholder {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  color: var(--card-muted);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.text-group {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.site-name {
  color: var(--card-text);
  font-family: var(--ui-font-display);
  font-size: 19px;
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: -0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site-desc {
  color: var(--card-muted);
  font-size: 13px;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.pin-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(var(--ui-theme-rgb), 0.12);
  font-size: 12px;
}

.selection-checkbox {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 10;
}

.checkbox-inner {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid rgba(29, 29, 31, 0.18);
  background: rgba(255, 255, 255, 0.9);
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease;

  &.checked {
    background: var(--ui-theme);
    border-color: var(--ui-theme);
    color: #fff;
  }
}

.selection-check-icon {
  width: 14px;
  height: 14px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.inherit-text {
  display: block;
  width: 100%;
  height: 100%;
  color: inherit;
  text-decoration: none;

  &.is-disabled {
    cursor: default;
  }
}
</style>
