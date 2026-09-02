<template>
  <div class="import-step">
    <button
      type="button"
      class="upload-dropzone"
      :class="{ active: dragActive }"
      @click="emit('pick')"
      @dragenter.prevent="dragActive = true"
      @dragover.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @drop.prevent="handleDrop"
    >
      <span class="upload-icon" aria-hidden="true">↥</span>
      <span class="upload-title">{{ t('bookmarkImport.dropzoneTitle') }}</span>
      <span class="upload-copy">{{ t('bookmarkImport.dropzoneCopy') }}</span>
      <span v-if="selectedFileName" class="upload-file">{{ selectedFileName }}</span>
    </button>

    <div class="import-help">
      <h4>{{ t('bookmarkImport.helpTitle') }}</h4>
      <ul>
        <li><strong>Chrome:</strong> {{ t('bookmarkImport.chromeGuide') }}</li>
        <li><strong>Firefox:</strong> {{ t('bookmarkImport.firefoxGuide') }}</li>
        <li><strong>Edge:</strong> {{ t('bookmarkImport.edgeGuide') }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  selectedFileName: string
}>()

const emit = defineEmits<{
  (e: 'pick'): void
  (e: 'drop', event: DragEvent): void
}>()

const dragActive = ref(false)

const handleDrop = (event: DragEvent) => {
  dragActive.value = false
  emit('drop', event)
}
</script>

<style scoped lang="scss">
.upload-dropzone {
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.upload-dropzone {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px 24px;
  border: 2px dashed rgba(var(--ui-theme-rgb), 0.26);
  border-radius: 18px;
  background: rgba(var(--ui-theme-rgb), 0.05);
  color: var(--gray-700);
  cursor: pointer;
  text-align: center;

  &:hover,
  &.active {
    border-color: rgba(var(--ui-theme-rgb), 0.48);
    background: rgba(var(--ui-theme-rgb), 0.1);
    transform: translateY(-2px);
    box-shadow: 0 18px 36px rgba(var(--ui-theme-rgb), 0.12);
  }
}

.upload-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: rgba(var(--ui-theme-rgb), 0.12);
  color: rgb(var(--ui-theme-rgb));
  font-size: 28px;
}

.upload-title {
  font-size: 17px;
  font-weight: 700;
}

.upload-copy,
.upload-file {
  font-size: 14px;
  color: var(--gray-500);
}

.upload-file {
  color: rgb(var(--ui-theme-rgb));
  font-weight: 600;
}

.import-help {
  margin-top: 20px;
  padding: 15px;
  background: var(--el-fill-color-light);
  border-radius: 8px;

  h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: var(--el-text-color-primary);
  }

  ul {
    margin: 0;
    padding-left: 20px;
    font-size: 13px;
    color: var(--el-text-color-secondary);

    li {
      margin: 5px 0;
    }
  }
}
</style>
