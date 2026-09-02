<template>
  <section class="settings-section">
    <div class="section-head row">
      <div>
        <h3 class="section-title">{{ t('settings.upload') }}</h3>
        <p class="section-copy">{{ t('settings.uploadSectionTip') }}</p>
      </div>
      <button
        type="button"
        class="settings-button secondary refresh-files-btn"
        :disabled="loadingFiles"
        @click="$emit('refresh')"
      >
        {{ loadingFiles ? t('common.loading') : t('settings.refreshList') }}
      </button>
    </div>

    <div class="section-fields">
      <div class="setting-block" data-setting-field="assetUpload">
        <div class="form-tip leading-copy">{{ t('settings.uploadTip') }}</div>
        <div class="inline-actions">
          <button
            type="button"
            class="settings-button success trigger-upload-btn"
            :disabled="uploading"
            @click="$emit('upload')"
          >
            {{ uploading ? t('common.loading') : t('settings.uploadBtn') }}
          </button>
        </div>

        <div class="asset-preview-grid">
          <div class="asset-preview-card" data-current-asset="logoUrl">
            <div class="asset-preview-header">
              <span class="asset-preview-label">{{ t('settings.logoUrl') }}</span>
              <button
                v-if="logoUrl"
                type="button"
                class="settings-chip ghost clear-asset-btn"
                @click="$emit('clear-asset', 'logoUrl')"
              >
                {{ t('settings.resetAsset') }}
              </button>
            </div>
            <div v-if="logoUrl" class="media-preview asset-media-frame">
              <img :src="logoUrl" class="logo-preview" alt="Logo Preview" />
            </div>
            <div v-else class="asset-preview-empty">{{ t('settings.notConfigured') }}</div>
          </div>

          <div class="asset-preview-card" data-current-asset="faviconUrl">
            <div class="asset-preview-header">
              <span class="asset-preview-label">{{ t('settings.favicon') }}</span>
              <button
                v-if="faviconUrl"
                type="button"
                class="settings-chip ghost clear-asset-btn"
                @click="$emit('clear-asset', 'faviconUrl')"
              >
                {{ t('settings.resetAsset') }}
              </button>
            </div>
            <div v-if="faviconUrl" class="media-preview asset-media-frame compact">
              <img :src="faviconUrl" class="favicon-preview" alt="Favicon Preview" />
            </div>
            <div v-else class="asset-preview-empty">{{ t('settings.notConfigured') }}</div>
          </div>

          <div class="asset-preview-card" data-current-asset="backgroundUrl">
            <div class="asset-preview-header">
              <span class="asset-preview-label">{{ t('settings.bgUrl') }}</span>
              <button
                v-if="backgroundUrl"
                type="button"
                class="settings-chip ghost clear-asset-btn"
                @click="$emit('clear-asset', 'backgroundUrl')"
              >
                {{ t('settings.resetAsset') }}
              </button>
            </div>
            <div
              v-if="previewUrl"
              class="bg-preview asset-bg-preview"
              :style="{ backgroundImage: `url(${previewUrl})` }"
            ></div>
            <div v-else class="asset-preview-empty">{{ t('settings.notConfigured') }}</div>
          </div>
        </div>

        <div class="uploaded-assets-shell" data-setting-field="uploadedFiles">
          <div class="uploaded-assets-head">
            <span class="setting-label">{{ t('settings.uploadedFiles') }}</span>
          </div>

          <UploadedFilesPanel
            :files="uploadedFiles"
            :loading="loadingFiles"
            @delete="onDeleteFile"
            @apply="onApplyFile"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UploadedFilesPanel from '@/components/admin/settings/UploadedFilesPanel.vue'
import type { UploadedFile } from '@/api/admin'

type AssetField = 'backgroundUrl' | 'faviconUrl' | 'logoUrl'

const { t } = useI18n()

defineProps<{
  logoUrl?: string
  faviconUrl?: string
  backgroundUrl?: string
  previewUrl: string
  uploading: boolean
  uploadedFiles: UploadedFile[]
  loadingFiles: boolean
}>()

const emit = defineEmits<{
  (e: 'clear-asset', field: AssetField): void
  (e: 'upload'): void
  (e: 'refresh'): void
  (e: 'delete-file', filename: string): void
  (e: 'apply-file', field: AssetField, url: string): void
}>()

const onDeleteFile = (filename: string) => emit('delete-file', filename)

const onApplyFile = (field: AssetField, url: string) => emit('apply-file', field, url)
</script>

<style scoped lang="scss">
// 拆分子组件共享 .settings-section 等样式：样式按需复制，改一处需同步另两处（Account/Site/Assets）。
.settings-section {
  padding: 16px 18px;
  border-radius: 18px;
  background: var(--ui-panel-bg, rgba(255, 255, 255, 0.72));
  border: 1px solid var(--ui-panel-border, rgba(148, 163, 184, 0.18));
  box-shadow: var(--ui-panel-shadow, 0 18px 38px rgba(15, 23, 42, 0.08));
}

.section-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;

  &.row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.section-copy {
  margin: 0;
  font-size: 13px;
  color: var(--ui-text-muted, rgba(71, 85, 105, 0.86));
  line-height: 1.45;
}

.section-fields {
  display: flex;
  flex-direction: column;
}

.section-fields > * + * {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--settings-divider);
}

.setting-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text-primary, rgba(15, 23, 42, 0.86));
}

.form-tip {
  margin-top: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ui-text-muted, rgba(71, 85, 105, 0.82));
}

.leading-copy {
  margin-bottom: 2px;
}

.inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.settings-button {
  border: none;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.66;
  }
}

.settings-button {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;

  &.secondary {
    background: var(--settings-secondary-bg);
    color: var(--settings-secondary-text);
  }

  &.success {
    background: var(--settings-success-bg);
    color: var(--settings-success-text);
  }
}

.settings-chip {
  min-height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.settings-chip.ghost {
  border: 1px solid var(--settings-chip-border);
  background: var(--settings-chip-bg);
  color: var(--settings-chip-text);
}

.asset-preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.asset-preview-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border-radius: 18px;
  background: var(--ui-panel-surface, rgba(255, 255, 255, 0.92));
  border: 1px solid var(--ui-panel-border, rgba(148, 163, 184, 0.18));
}

.asset-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.asset-preview-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ui-text-primary, rgba(15, 23, 42, 0.86));
}

.asset-preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 12px;
  border-radius: 14px;
  background: var(--settings-preview-empty-bg);
  color: var(--ui-text-muted, rgba(71, 85, 105, 0.82));
  font-size: 12px;
  text-align: center;
}

.media-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 68px;
  padding: 10px 12px;
  border-radius: 16px;
  background: var(--settings-media-bg);
  border: 1px solid var(--ui-panel-border, rgba(148, 163, 184, 0.18));

  &.compact {
    min-height: 56px;
  }
}

.asset-media-frame {
  width: 100%;
  min-height: 120px;
}

.logo-preview {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  object-fit: contain;
  background: var(--settings-image-bg);
}

.favicon-preview {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  object-fit: contain;
  background: var(--settings-image-bg);
}

.bg-preview {
  width: 220px;
  height: 132px;
  border-radius: 18px;
  background-size: cover;
  background-position: center;
  border: 1px solid var(--ui-panel-border, rgba(148, 163, 184, 0.2));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.asset-bg-preview {
  width: 100%;
  height: 132px;
}

.uploaded-assets-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--settings-divider);
}

.uploaded-assets-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media screen and (max-width: 900px) {
  .section-head.row {
    flex-direction: column;
    align-items: stretch;
  }

  .asset-preview-grid {
    grid-template-columns: 1fr;
  }

  .bg-preview {
    width: 100%;
    max-width: 320px;
  }

  .section-head.row .settings-button,
  .trigger-upload-btn {
    width: 100%;
  }
}
</style>
