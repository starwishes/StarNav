<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="context-menu"
    role="menu"
    :style="menuStyle"
    @click.stop
    @keydown="handleMenuKeydown"
  >
    <template v-if="item">
      <button type="button" class="menu-item" role="menuitem" @click="$emit('selection-mode')">
        <AppIcon name="icon-md-clipboard" class="menu-icon" />
        {{ t('context.multiSelect') }}
      </button>
      <button type="button" class="menu-item" role="menuitem" @click="$emit('move-item')">
        <AppIcon name="icon-md-arrow-round-up" class="menu-icon" />
        {{ t('context.move') }}
      </button>
      <button type="button" class="menu-item" role="menuitem" @click="$emit('toggle-pin')">
        <AppIcon v-if="item?.pinned" name="icon-md-arrow-round-down" class="menu-icon" />
        <AppIcon v-else name="icon-md-arrow-round-up" class="menu-icon" />
        {{ item?.pinned ? t('context.unpin') : t('context.pin') }}
      </button>

      <button type="button" class="menu-item" role="menuitem" @click="$emit('edit-item')">
        <AppIcon name="icon-bianji" class="menu-icon" /> {{ t('common.edit') }}
      </button>
      <button type="button" class="menu-item delete" role="menuitem" @click="$emit('delete-item')">
        <AppIcon name="icon-md-trash" class="menu-icon" /> {{ t('common.delete') }}
      </button>
    </template>
    <template v-else-if="category">
      <button
        type="button"
        class="menu-item"
        role="menuitem"
        :disabled="isFirstCategory"
        @click="!isFirstCategory && $emit('move-category', -1)"
      >
        <AppIcon name="icon-md-arrow-round-up" class="menu-icon" /> {{ t('context.moveUp') }}
      </button>
      <button
        type="button"
        class="menu-item"
        role="menuitem"
        :disabled="isLastCategory"
        @click="!isLastCategory && $emit('move-category', 1)"
      >
        <AppIcon name="icon-md-arrow-round-down" class="menu-icon" />
        {{ t('context.moveDown') }}
      </button>
      <button type="button" class="menu-item" role="menuitem" @click="$emit('edit-category')">
        <AppIcon name="icon-bianji" class="menu-icon" /> {{ t('common.edit') }}
      </button>
      <button
        type="button"
        class="menu-item delete"
        role="menuitem"
        @click="$emit('delete-category')"
      >
        <AppIcon name="icon-md-trash" class="menu-icon" /> {{ t('common.delete') }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { computed, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Category, Item } from '@/types'

const props = defineProps<{
  visible?: boolean
  x?: number
  y?: number
  item?: Item | null
  category?: Category | null
  isFirstCategory?: boolean
  isLastCategory?: boolean
}>()

const emit = defineEmits<{
  (e: 'selection-mode'): void
  (e: 'move-item'): void
  (e: 'toggle-pin'): void
  (e: 'edit-item'): void
  (e: 'delete-item'): void
  (e: 'move-category', direction: -1 | 1): void
  (e: 'edit-category'): void
  (e: 'delete-category'): void
  (e: 'close'): void
}>()

const { t } = useI18n()

const menuRef = ref<HTMLElement | null>(null)
const VIEWPORT_MARGIN = 8
// offsetWidth/offsetHeight 非响应式，打开挂载完成后 +1 强制钳制位置重算
const clampTick = ref(0)

const collectItems = () =>
  Array.from(menuRef.value?.querySelectorAll<HTMLElement>('.menu-item') || [])

const focusIndex = (delta: 1 | -1) => {
  const items = collectItems()
  if (items.length === 0) return
  const currentIndex = items.indexOf(document.activeElement as HTMLElement)
  // 无聚焦项时按方向取首/末项（ArrowDown→首项、ArrowUp→末项），
  // 起始值 -1/0 让循环第一步即落在目标项，避免首个方向键跳过一项。
  let nextIndex = currentIndex < 0 ? (delta === 1 ? -1 : 0) : currentIndex
  for (let step = 0; step < items.length; step += 1) {
    nextIndex = (nextIndex + delta + items.length) % items.length
    if (!(items[nextIndex] as HTMLButtonElement).disabled) {
      items[nextIndex].focus()
      return
    }
  }
}

const handleMenuKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    focusIndex(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    focusIndex(-1)
  }
}

// 钳制到视口内：避免菜单在右侧/底部溢出视口导致不可见、不可操作。
// clampTick 作为响应式依赖：offsetWidth/offsetHeight 读取是非响应式的，
// 打开时在 watch(visible) 里 nextTick 后 +1 触发按真实尺寸重算。
const menuStyle = computed(() => {
  void clampTick.value
  const menuWidth = menuRef.value?.offsetWidth || 200
  const menuHeight = menuRef.value?.offsetHeight || 260
  const maxLeft = Math.max(0, window.innerWidth - menuWidth - VIEWPORT_MARGIN)
  const maxTop = Math.max(0, window.innerHeight - menuHeight - VIEWPORT_MARGIN)
  const left = Math.min(Math.max(props.x ?? 0, 0), maxLeft)
  const top = Math.min(Math.max(props.y ?? 0, 0), maxTop)
  return { top: `${top}px`, left: `${left}px` }
})

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await nextTick()
    // 挂载完成后再按真实尺寸钳制一次（首次 computed 读取到的是默认尺寸）
    clampTick.value += 1
    // 打开时把焦点移入菜单，支持上下键/Enter 操作
    collectItems()[0]?.focus()
  }
)
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
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: 14px;
    background: transparent;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    text-align: left;
    color: var(--context-menu-text);
    cursor: pointer;
    transition:
      background-color 0.18s ease,
      color 0.18s ease;

    &:hover:not(:disabled) {
      background: var(--context-menu-hover-bg);
      color: var(--context-menu-text-strong);
    }

    &:focus-visible {
      outline: 2px solid rgba(var(--ui-theme-rgb), 0.35);
      outline-offset: -2px;
    }

    &.delete:hover:not(:disabled) {
      background: var(--context-menu-delete-hover-bg);
      color: var(--context-menu-delete-hover-text);
    }

    &:disabled {
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
