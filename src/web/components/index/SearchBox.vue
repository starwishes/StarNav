<template>
  <div class="unified-search-box">
    <div class="mode-switcher">
      <div
        class="mode-btn"
        :class="{ active: searchMode === 'local' }"
        title="本地书签搜索"
        @click="$emit('update:searchMode', 'local')"
      >
        <AppIcon name="icon-md-search" class="mode-icon" />
      </div>

      <div class="mode-divider"></div>

      <slot name="engine-selector"></slot>
    </div>

    <input
      ref="inputRef"
      :value="modelValue"
      :placeholder="placeholder"
      class="search-input"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @focus="$emit('focus')"
      @blur="$emit('blur', $event)"
      @keyup.enter="$emit('enter')"
    />

    <div v-if="modelValue" class="clear-btn" @click="$emit('clear')">
      <AppIcon name="icon-md-close-circle" class="clear-icon" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { ref } from 'vue'

defineProps<{
  modelValue: string
  searchMode: 'local' | 'online'
  placeholder: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:searchMode', mode: 'local' | 'online'): void
  (e: 'focus'): void
  (e: 'blur', event: FocusEvent): void
  (e: 'enter'): void
  (e: 'clear'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>

<style scoped lang="scss">
.unified-search-box {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 74px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(29, 29, 31, 0.08);
  box-shadow:
    0 24px 50px rgba(0, 0, 0, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:focus-within {
    border-color: rgba(var(--ui-theme-rgb), 0.4);
    box-shadow:
      0 28px 56px rgba(0, 0, 0, 0.16),
      0 0 0 6px rgba(var(--ui-theme-rgb), 0.08);
    transform: translateY(-1px);
  }
}

.mode-switcher {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
  padding-right: 8px;
}

.mode-btn {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  cursor: pointer;
  color: rgba(29, 29, 31, 0.56);
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    background: rgba(29, 29, 31, 0.05);
    color: #1d1d1f;
    transform: translateY(-1px);
  }

  &.active {
    background: var(--ui-theme);
    color: #fff;
    box-shadow: 0 12px 24px rgba(var(--ui-theme-rgb), 0.2);
  }

  :deep(.engine-icon) {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    object-fit: cover;
  }
}

.mode-icon,
.clear-icon {
  width: 18px;
  height: 18px;
}

.mode-divider {
  width: 1px;
  height: 30px;
  background: rgba(29, 29, 31, 0.12);
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 56px;
  background: transparent;
  border: none;
  outline: none;
  padding: 0 14px;
  color: #1d1d1f;
  font-family: var(--ui-font-display);
  font-size: clamp(18px, 3vw, 24px);
  font-weight: 500;
  letter-spacing: -0.03em;

  &::placeholder {
    color: rgba(29, 29, 31, 0.42);
  }
}

.clear-btn {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  border-radius: 50%;
  cursor: pointer;
  color: rgba(29, 29, 31, 0.36);
  transition:
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: rgba(29, 29, 31, 0.06);
    color: #1d1d1f;
  }
}

@media screen and (max-width: 640px) {
  .unified-search-box {
    min-height: 64px;
    padding: 6px 10px;
  }

  .mode-btn {
    width: 38px;
    height: 38px;
  }

  .search-input {
    height: 48px;
    font-size: 17px;
  }

  .clear-btn {
    width: 34px;
    height: 34px;
    margin-left: 4px;
  }
}

:global(:root[data-theme-preset='cinema'] .unified-search-box) {
  background: rgba(24, 24, 27, 0.9);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow:
    0 24px 50px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

:global(:root[data-theme-preset='cinema'] .mode-btn) {
  color: rgba(255, 255, 255, 0.62);

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
}

:global(:root[data-theme-preset='cinema'] .mode-divider) {
  background: rgba(255, 255, 255, 0.14);
}

:global(:root[data-theme-preset='cinema'] .search-input) {
  color: #f5f5f7;

  &::placeholder {
    color: rgba(255, 255, 255, 0.42);
  }
}

:global(:root[data-theme-preset='cinema'] .clear-btn) {
  color: rgba(255, 255, 255, 0.46);

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
}

:global(:root[theme-mode='dark'] .unified-search-box) {
  background: color-mix(
    in srgb,
    var(--ui-panel-surface, rgba(15, 23, 42, 0.92)) 92%,
    rgba(var(--ui-theme-rgb), 0.08) 8%
  );
  border-color: var(--ui-panel-border, rgba(148, 163, 184, 0.18));
  box-shadow:
    0 24px 50px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

:global(:root[theme-mode='dark'] .mode-btn) {
  color: rgba(226, 232, 240, 0.64);

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--ui-text-primary, #f8fafc);
  }
}

:global(:root[theme-mode='dark'] .mode-divider) {
  background: rgba(255, 255, 255, 0.14);
}

:global(:root[theme-mode='dark'] .search-input) {
  color: var(--ui-text-primary, #f8fafc);

  &::placeholder {
    color: rgba(226, 232, 240, 0.42);
  }
}

:global(:root[theme-mode='dark'] .clear-btn) {
  color: rgba(226, 232, 240, 0.46);

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--ui-text-primary, #f8fafc);
  }
}
</style>

