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
