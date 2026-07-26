<template>
  <div
    class="site-card-wrapper"
    @click="handleClick"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <a
      class="inherit-text"
      :class="{ 'is-disabled': selectionMode }"
      :href="selectionMode ? 'javascript:void(0)' : undefined"
      target="_blank"
      @click.prevent="!selectionMode && $emit('click', $event)"
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

        <div v-if="item.pinned" class="pin-badge">📌</div>

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
import type { Item } from '@/types'
import { buildIconCandidates, isRenderableIconUrl, markIconUnavailable } from './siteIconHelpers'

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
@use './SiteCard.scss';
</style>

