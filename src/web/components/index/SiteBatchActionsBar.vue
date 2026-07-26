<template>
  <transition name="slide-up">
    <div v-if="visible" class="batch-actions-bar">
      <div class="selection-info">
        {{ t('table.selectedCount', { count: selectedCount }) }}
      </div>
      <div class="action-buttons">
        <AppSelect
          :model-value="batchMoveTarget"
          class="batch-select"
          @update:model-value="onTargetChange"
        >
          <option value="" disabled>{{ t('table.batchMovePlaceholder') }}</option>
          <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
            {{ cat.name }}
          </option>
        </AppSelect>

        <button
          type="button"
          class="batch-button is-primary"
          :disabled="!batchMoveTarget"
          @click="$emit('batch-move')"
        >
          {{ t('table.batchMove') }}
        </button>

        <button type="button" class="batch-button is-danger" @click="$emit('batch-delete')">
          {{ t('table.batchDelete') }}
        </button>

        <button type="button" class="batch-button" @click="$emit('cancel')">
          {{ t('table.cancel') }}
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import AppSelect from '@/components/AppSelect.vue'
import { useI18n } from 'vue-i18n'
import type { Category } from '@/types'

defineProps<{
  visible?: boolean
  selectedCount?: number
  batchMoveTarget?: string | number
  categories?: Pick<Category, 'id' | 'name'>[]
}>()

const emit = defineEmits<{
  (e: 'update:batchMoveTarget', value: string | number): void
  (e: 'batch-move'): void
  (e: 'batch-delete'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

const onTargetChange = (value: string | number | null | undefined) => {
  emit('update:batchMoveTarget', value ?? '')
}
</script>

<style scoped lang="scss">
.batch-actions-bar {
  --batch-bar-bg: rgba(255, 255, 255, 0.96);
  --batch-bar-border: rgba(15, 23, 42, 0.1);
  --batch-bar-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
  --batch-bar-text: rgba(15, 23, 42, 0.78);
  --batch-bar-text-strong: #0f172a;
  --batch-control-bg: rgba(15, 23, 42, 0.04);
  --batch-control-border: rgba(15, 23, 42, 0.12);
  --batch-control-text: #0f172a;
  --batch-danger-bg: rgba(220, 38, 38, 0.1);
  --batch-danger-border: rgba(220, 38, 38, 0.16);
  --batch-danger-text: #b91c1c;

  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 320px;
  padding: 14px 18px;
  border-radius: 999px;
  background: var(--batch-bar-bg);
  border: 1px solid var(--batch-bar-border);
  box-shadow: var(--batch-bar-shadow);
  backdrop-filter: blur(18px);
  transform: translateX(-50%);
  color: var(--batch-bar-text);
}

.selection-info {
  font-size: 14px;
  color: var(--batch-bar-text);

  b {
    color: var(--batch-bar-text-strong);
  }
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.batch-select,
.batch-button {
  min-height: 42px;
  border-radius: 999px;
  font-size: 14px;
}

.batch-select {
  min-width: 148px;
  padding: 0 40px 0 16px;
  border: 1px solid var(--batch-control-border);
  background: var(--batch-control-bg);
  color: var(--batch-control-text);
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;
}

.batch-button {
  border: 1px solid var(--batch-control-border);
  background: var(--batch-control-bg);
  color: var(--batch-control-text);
  padding: 0 18px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.is-primary {
    background: var(--ui-theme);
    border-color: transparent;
    color: #fff;
  }

  &.is-danger {
    background: var(--batch-danger-bg);
    color: var(--batch-danger-text);
    border-color: var(--batch-danger-border);
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 100%);
}

@media screen and (max-width: 640px) {
  .batch-actions-bar {
    width: calc(100% - 28px);
    min-width: 0;
    border-radius: 28px;
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .action-buttons {
    width: 100%;
  }

  .batch-select,
  .batch-button {
    width: 100%;
  }
}

:global(:root[theme-mode='dark'] .batch-actions-bar) {
  --batch-bar-bg: rgba(20, 20, 22, 0.92);
  --batch-bar-border: rgba(255, 255, 255, 0.08);
  --batch-bar-shadow: 0 24px 48px rgba(0, 0, 0, 0.24);
  --batch-bar-text: rgba(255, 255, 255, 0.74);
  --batch-bar-text-strong: #fff;
  --batch-control-bg: rgba(255, 255, 255, 0.08);
  --batch-control-border: rgba(255, 255, 255, 0.12);
  --batch-control-text: rgba(255, 255, 255, 0.88);
  --batch-danger-bg: rgba(255, 69, 58, 0.12);
  --batch-danger-border: rgba(255, 69, 58, 0.16);
  --batch-danger-text: #ffb0a8;
}
</style>
