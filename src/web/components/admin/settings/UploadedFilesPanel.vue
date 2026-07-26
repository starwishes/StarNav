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
.uploaded-files {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 18px;
  background: var(--ui-panel-surface, rgba(248, 250, 252, 0.84));
  border: 1px solid var(--ui-panel-border, rgba(148, 163, 184, 0.18));
}

.file-preview {
  width: 120px;
  height: 80px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  border: 1px solid var(--ui-panel-border, rgba(148, 163, 184, 0.18));
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ui-text-primary, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  margin-top: 4px;
  font-size: 11px;
  color: var(--ui-text-muted, rgba(71, 85, 105, 0.82));
}

.file-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.settings-chip {
  min-height: 34px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
}

.settings-chip.primary {
  background: rgba(var(--ui-theme-rgb), 0.12);
  color: var(--ui-theme);
}

.settings-chip.success {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.settings-chip.warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.settings-chip.danger {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}

.settings-empty-state {
  padding: 28px 12px;
}

.empty-title {
  font-size: 14px;
  color: var(--ui-text-muted, rgba(71, 85, 105, 0.82));
}

@media screen and (max-width: 900px) {
  .file-item {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

