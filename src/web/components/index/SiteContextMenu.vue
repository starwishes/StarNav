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
      <div class="menu-item" @click="$emit('move-item')">
        <AppIcon name="icon-md-arrow-round-up" class="menu-icon" />
        {{ t('context.move') }}
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
  (e: 'move-item'): void
  (e: 'toggle-pin'): void
  (e: 'edit-item'): void
  (e: 'delete-item'): void
  (e: 'move-category', direction: -1 | 1): void
  (e: 'edit-category'): void
  (e: 'delete-category'): void
}>()

const { t } = useI18n()
</script>

<style scoped lang="scss">
.button-icon,
.menu-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: inherit;
  font-size: 16px;
  line-height: 1;
}

.context-menu {
  --context-menu-bg: rgba(255, 255, 255, 0.96);
  --context-menu-border: rgba(15, 23, 42, 0.1);
  --context-menu-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
  --context-menu-text: #0f172a;
  --context-menu-text-strong: #020617;
  --context-menu-hover-bg: rgba(15, 23, 42, 0.06);
  --context-menu-delete-hover-bg: rgba(220, 38, 38, 0.1);
  --context-menu-delete-hover-text: #b91c1c;

  position: fixed;
  z-index: 1000;
  min-width: 160px;
  padding: 8px;
  border-radius: 20px;
  background: var(--context-menu-bg);
  border: 1px solid var(--context-menu-border);
  box-shadow: var(--context-menu-shadow);
  backdrop-filter: blur(18px);
  color: var(--context-menu-text);

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
    font-size: 13px;
    font-weight: 500;
    color: var(--context-menu-text);
    cursor: pointer;
    transition:
      background-color 0.18s ease,
      color 0.18s ease;

    &:hover {
      background: var(--context-menu-hover-bg);
      color: var(--context-menu-text-strong);
    }

    &.delete:hover {
      background: var(--context-menu-delete-hover-bg);
      color: var(--context-menu-delete-hover-text);
    }

    &.disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }
  }
}

:global(:root[theme-mode='dark'] .context-menu) {
  --context-menu-bg: rgba(20, 20, 22, 0.94);
  --context-menu-border: rgba(255, 255, 255, 0.08);
  --context-menu-shadow: 0 24px 48px rgba(0, 0, 0, 0.28);
  --context-menu-text: rgba(255, 255, 255, 0.88);
  --context-menu-text-strong: #fff;
  --context-menu-hover-bg: rgba(255, 255, 255, 0.08);
  --context-menu-delete-hover-bg: rgba(255, 69, 58, 0.16);
  --context-menu-delete-hover-text: #ffb0a8;
}
</style>
