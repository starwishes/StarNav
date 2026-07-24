<template>
  <div
    v-if="visible"
    class="context-menu"
    :style="{ top: y + 'px', left: x + 'px' }"
    @click.stop
  >
    <template v-if="item">
      <div class="menu-item" @click="$emit('selection-mode')">
        <AppIcon name="icon-md-clipboard" class="menu-icon" />
        {{ t('context.multiSelect') }}
      </div>
      <div class="menu-item" @click="$emit('toggle-pin')">
        <AppIcon
          v-if="item?.pinned"
          name="icon-md-arrow-round-down"
          class="menu-icon"
        />
        <AppIcon v-else name="icon-md-arrow-round-up" class="menu-icon" />
        {{ item?.pinned ? t('context.unpin') : t('context.pin') }}
      </div>

      <div class="menu-item" @click="$emit('edit-item')">
        <AppIcon name="icon-bianji" class="menu-icon" /> {{ t('common.edit') }}
      </div>
      <div class="menu-item delete" @click="$emit('delete-item')">
        <AppIcon name="icon-md-trash" class="menu-icon" /> {{ t('common.delete') }}
      </div>
    </template>
    <template v-else-if="category">
      <div
        class="menu-item"
        :class="{ disabled: isFirstCategory }"
        @click="!isFirstCategory && $emit('move-category', -1)"
      >
        <AppIcon name="icon-md-arrow-round-up" class="menu-icon" /> {{ t('context.moveUp') }}
      </div>
      <div
        class="menu-item"
        :class="{ disabled: isLastCategory }"
        @click="!isLastCategory && $emit('move-category', 1)"
      >
        <AppIcon name="icon-md-arrow-round-down" class="menu-icon" />
        {{ t('context.moveDown') }}
      </div>
      <div class="menu-item" @click="$emit('edit-category')">
        <AppIcon name="icon-bianji" class="menu-icon" /> {{ t('common.edit') }}
      </div>
      <div class="menu-item delete" @click="$emit('delete-category')">
        <AppIcon name="icon-md-trash" class="menu-icon" /> {{ t('common.delete') }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { useI18n } from 'vue-i18n'
import type { Category, Item } from '@/types'

defineProps<{
  visible?: boolean
  x?: number
  y?: number
  item?: Item | null
  category?: Category | null
  isFirstCategory?: boolean
  isLastCategory?: boolean
}>()

defineEmits<{
  (e: 'selection-mode'): void
  (e: 'toggle-pin'): void
  (e: 'edit-item'): void
  (e: 'delete-item'): void
  (e: 'move-category', direction: -1 | 1): void
  (e: 'edit-category'): void
  (e: 'delete-category'): void
}>()

const { t } = useI18n()
</script>
