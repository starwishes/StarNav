<template>
  <div class="system-settings">
    <form class="settings-form" @submit.prevent="saveSettings">
      <SystemSettingsAccount
        :registration-enabled="settings.registrationEnabled"
        :default-user-level="settings.defaultUserLevel"
        :default-level-options="defaultLevelOptions"
        @update:registration-enabled="settings.registrationEnabled = $event"
        @update:default-user-level="settings.defaultUserLevel = $event"
      />

      <SystemSettingsSite
        :site-name="settings.siteName"
        :timezone="settings.timezone"
        :home-url="settings.homeUrl"
        :footer-html="settings.footerHtml"
        :timezone-options="timezoneOptions"
        @update:site-name="settings.siteName = $event"
        @update:timezone="settings.timezone = $event"
        @update:home-url="settings.homeUrl = $event"
        @update:footer-html="settings.footerHtml = $event"
        @fill-default-footer="fillDefaultFooter"
      />

      <input
        ref="uploadInputRef"
        class="sr-only-input"
        type="file"
        accept="image/*"
        @change="handleFileChange"
      />

      <SystemSettingsAssets
        :logo-url="settings.logoUrl"
        :favicon-url="settings.faviconUrl"
        :background-url="settings.backgroundUrl"
        :preview-url="previewUrl"
        :uploading="uploading"
        :uploaded-files="uploadedFiles"
        :loading-files="loadingFiles"
        @clear-asset="clearAsset"
        @upload="triggerUpload"
        @refresh="fetchUploadedFiles"
        @delete-file="deleteFile"
        @apply-file="applyUploadedFile"
      />

      <div class="form-actions">
        <button type="submit" class="settings-button primary save-settings-btn">
          {{ t('settings.saveSettings') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SystemSettings as SystemSettingsModel } from '@/api'
import SystemSettingsAccount from '@/components/admin/SystemSettingsAccount.vue'
import SystemSettingsSite from '@/components/admin/SystemSettingsSite.vue'
import SystemSettingsAssets from '@/components/admin/SystemSettingsAssets.vue'
import { useSystemSettingsForm } from '@/components/admin/useSystemSettingsForm'

type AssetField = 'backgroundUrl' | 'faviconUrl' | 'logoUrl'

const { t } = useI18n()

const props = defineProps<{ initialSettings: Partial<SystemSettingsModel> }>()
const emit = defineEmits<{
  (e: 'save', settings: Partial<SystemSettingsModel>): void
}>()

const {
  settings,
  uploadInputRef,
  uploading,
  uploadedFiles,
  loadingFiles,
  previewUrl,
  triggerUpload,
  fetchUploadedFiles,
  deleteFile,
  handleFileChange,
  applyUploadedFile,
  defaultLevelOptions,
  timezoneOptions,
  fillDefaultFooter,
  saveSettings
} = useSystemSettingsForm(() => props.initialSettings, emit, t)

const clearAsset = (field: AssetField) => {
  settings[field] = ''
}

// TS 6 noUnusedLocals no longer treats template ref bindings as script reads.
void uploadInputRef
</script>

<style scoped lang="scss">
.system-settings {
  --settings-control-bg: var(--ui-panel-surface, rgba(255, 255, 255, 0.92));
  --settings-control-focus-bg: rgba(255, 255, 255, 0.98);
  --settings-control-border: rgba(148, 163, 184, 0.34);
  --settings-control-text: var(--ui-text-primary, #0f172a);
  --settings-control-placeholder: rgba(100, 116, 139, 0.82);
  --settings-secondary-bg: rgba(148, 163, 184, 0.14);
  --settings-secondary-text: rgba(15, 23, 42, 0.82);
  --settings-success-bg: rgba(22, 163, 74, 0.12);
  --settings-success-text: #15803d;
  --settings-preview-empty-bg: rgba(148, 163, 184, 0.1);
  --settings-media-bg: rgba(248, 250, 252, 0.9);
  --settings-image-bg: #f8fafc;
  --settings-chip-bg: rgba(148, 163, 184, 0.08);
  --settings-chip-border: rgba(148, 163, 184, 0.22);
  --settings-chip-text: var(--ui-text-muted, rgba(71, 85, 105, 0.86));
  --settings-divider: rgba(148, 163, 184, 0.14);
  color: var(--ui-text-primary, #0f172a);
  max-width: 760px;
  container-type: inline-size;
  container-name: system-settings;
}

:global(:root[theme-mode='dark'] .system-settings) {
  --settings-control-bg: rgba(15, 23, 42, 0.88);
  --settings-control-focus-bg: rgba(15, 23, 42, 0.96);
  --settings-control-border: rgba(148, 163, 184, 0.28);
  --settings-control-placeholder: rgba(203, 213, 225, 0.56);
  --settings-secondary-bg: rgba(51, 65, 85, 0.82);
  --settings-secondary-text: rgba(226, 232, 240, 0.88);
  --settings-success-bg: rgba(22, 163, 74, 0.18);
  --settings-success-text: #86efac;
  --settings-preview-empty-bg: rgba(30, 41, 59, 0.82);
  --settings-media-bg: rgba(15, 23, 42, 0.92);
  --settings-image-bg: rgba(15, 23, 42, 0.96);
  --settings-chip-bg: rgba(51, 65, 85, 0.74);
  --settings-chip-border: rgba(148, 163, 184, 0.22);
  --settings-chip-text: rgba(226, 232, 240, 0.82);
  --settings-divider: rgba(148, 163, 184, 0.18);
  color-scheme: dark;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

  &.primary {
    background: linear-gradient(135deg, var(--ui-theme), rgba(var(--ui-theme-rgb), 0.74));
    box-shadow: 0 14px 28px rgba(var(--ui-theme-rgb), 0.2);
    color: #fff;
  }
}

.form-actions {
  position: fixed;
  top: 50%;
  right: clamp(56px, 8vw, 160px);
  z-index: 80;
  transform: translateY(-50%);
  display: flex;
  justify-content: flex-end;
  padding-top: 0;
  pointer-events: none;
}

.save-settings-btn {
  min-width: 156px;
  min-height: 56px;
  padding-inline: 24px;
  box-shadow:
    0 18px 34px rgba(var(--ui-theme-rgb), 0.24),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset;
  pointer-events: auto;
}

.sr-only-input {
  display: none;
}

@media screen and (max-width: 900px) {
  .form-actions {
    top: auto;
    right: 16px;
    bottom: 16px;
    left: 16px;
    transform: none;
    justify-content: stretch;
  }

  .form-actions .settings-button {
    width: 100%;
  }
}
</style>
