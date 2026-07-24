<template>
  <div v-if="files.length > 0" class="uploaded-files">
    <div v-for="file in files" :key="file.filename" class="file-item">
      <div class="file-preview" :style="{ backgroundImage: `url(${file.url})` }"></div>
      <div class="file-info">
        <div class="file-name">{{ file.filename }}</div>
        <div class="file-meta">
          {{ formatSize(file.size) }} · {{ formatDateTime(file.uploadedAt) }}
        </div>
      </div>
      <div class="file-actions">
        <button
          type="button"
          class="settings-chip primary"
          @click="$emit('apply', 'backgroundUrl', file.url)"
        >
          {{ t('settings.setBg') }}
        </button>
        <button
          type="button"
          class="settings-chip success"
          @click="$emit('apply', 'faviconUrl', file.url)"
        >
          {{ t('settings.setFavicon') }}
        </button>
        <button
          type="button"
          class="settings-chip warning"
          @click="$emit('apply', 'logoUrl', file.url)"
        >
          {{ t('settings.setLogo') }}
        </button>
        <button type="button" class="settings-chip danger" @click="$emit('delete', file.filename)">
          {{ t('common.delete') }}
        </button>
      </div>
    </div>
  </div>

  <div v-else-if="!loading" class="sn-empty-state settings-empty-state">
    <div class="empty-title">{{ t('settings.noFiles') }}</div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDateTimeFormatter } from '@/composables/useDateTimeFormatter'
import type { UploadedFile } from '@/api/admin'

type AssetField = 'backgroundUrl' | 'faviconUrl' | 'logoUrl'

defineProps<{
  files: UploadedFile[]
  loading: boolean
}>()

defineEmits<{
  (e: 'delete', filename: string): void
  (e: 'apply', field: AssetField, url: string): void
}>()

const { t } = useI18n()
const { formatDateTime } = useDateTimeFormatter()

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped lang="scss">
@import './UploadedFilesPanel.scss';
</style>

