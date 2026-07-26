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
@use './SearchBox.scss';
</style>

