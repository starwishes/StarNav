<template>
  <div class="import-step import-result">
    <div class="result-panel">
      <div class="result-icon" :class="{ importing }">{{ importing ? '…' : '✓' }}</div>
      <h4 class="result-title">
        {{ importing ? t('bookmarkImport.importingTitle') : t('bookmarkImport.doneTitle') }}
      </h4>
      <p class="result-copy">
        {{
          importing
            ? t('bookmarkImport.importingCopy')
            : t('bookmarkImport.resultCopy', { count: importedCount })
        }}
      </p>
      <button v-if="!importing" type="button" class="dialog-button primary" @click="emit('close')">
        {{ t('bookmarkImport.doneAction') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  importing: boolean
  importedCount: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<style scoped lang="scss">
.import-result {
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}

.result-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
  font-size: 40px;
  font-weight: 700;
}

.result-icon.importing {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  animation: pulse 1s ease-in-out infinite;
}

.result-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.result-copy {
  margin: 0;
  color: var(--gray-500);
}

.dialog-button {
  border: none;
  border-radius: 12px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.dialog-button.primary {
  background: linear-gradient(135deg, rgb(var(--ui-theme-rgb)), rgba(var(--ui-theme-rgb), 0.82));
  color: #fff;
  box-shadow: 0 14px 30px rgba(var(--ui-theme-rgb), 0.2);
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}
</style>
