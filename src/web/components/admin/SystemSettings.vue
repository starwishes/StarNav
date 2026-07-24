<template>
  <div class="system-settings">
    <form class="settings-form" @submit.prevent="saveSettings">
      <section class="settings-section">
        <div class="section-head">
          <h3 class="section-title">{{ t('settings.accountSettings') }}</h3>
          <p class="section-copy">{{ t('settings.accountSettingsTip') }}</p>
        </div>

        <div class="section-fields">
          <div class="setting-block setting-block--toggle" data-setting-field="registrationEnabled">
            <div class="setting-copy">
              <label class="setting-label">{{ t('settings.registration') }}</label>
              <div class="form-tip">{{ t('settings.registrationTip') }}</div>
            </div>
            <label class="toggle-switch">
              <input v-model="settings.registrationEnabled" class="toggle-input" type="checkbox" />
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
            </label>
          </div>

          <label class="setting-block" data-setting-field="defaultUserLevel">
            <span class="setting-label">{{ t('settings.defaultLevel') }}</span>
            <span class="form-tip">{{ t('settings.defaultLevelTip') }}</span>
            <AppSelect v-model.number="settings.defaultUserLevel" class="settings-select">
              <option
                v-for="option in defaultLevelOptions"
                :key="String(option.value)"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </AppSelect>
          </label>
        </div>
      </section>

      <section class="settings-section">
        <div class="section-head">
          <h3 class="section-title">{{ t('settings.siteInfo') }}</h3>
          <p class="section-copy">{{ t('settings.siteInfoTip') }}</p>
        </div>

        <div class="section-fields">
          <label class="setting-block" data-setting-field="siteName">
            <span class="setting-label">{{ t('settings.siteNameSettings') }}</span>
            <span class="form-tip">{{ t('settings.siteNameTip') }}</span>
            <input
              v-model="settings.siteName"
              class="settings-input"
              :placeholder="t('notification.siteName')"
              autocomplete="off"
            />
          </label>

          <label class="setting-block" data-setting-field="timezone">
            <span class="setting-label">{{ t('settings.timezone') }}</span>
            <span class="form-tip">{{ t('settings.timezoneTip') }}</span>
            <AppSelect v-model="settings.timezone" class="settings-select">
              <option
                v-for="option in timezoneOptions"
                :key="option.value || 'local'"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </AppSelect>
          </label>

          <label class="setting-block" data-setting-field="homeUrl">
            <span class="setting-label">{{ t('settings.homeUrl') }}</span>
            <span class="form-tip">{{ t('settings.homeUrlTip') }}</span>
            <input
              v-model="settings.homeUrl"
              class="settings-input"
              :placeholder="t('settings.homeUrlPlaceholder')"
              autocomplete="off"
              spellcheck="false"
            />
          </label>

          <label class="setting-block" data-setting-field="footerHtml">
            <span class="setting-label">{{ t('settings.footerHtml') }}</span>
            <span class="form-tip">{{ t('settings.footerHtmlTip') }}</span>
            <textarea
              v-model="settings.footerHtml"
              class="settings-textarea"
              :rows="4"
              :placeholder="t('settings.footerPlaceholder')"
            />
            <button
              type="button"
              class="settings-button secondary fill-footer-btn"
              @click="fillDefaultFooter"
            >
              {{ t('settings.useDefaultTemplate') }}
            </button>
          </label>
        </div>
      </section>

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
            @click="fetchUploadedFiles"
          >
            {{ loadingFiles ? t('common.loading') : t('settings.refreshList') }}
          </button>
        </div>

        <div class="section-fields">
          <div class="setting-block" data-setting-field="assetUpload">
            <div class="form-tip leading-copy">{{ t('settings.uploadTip') }}</div>
            <div class="inline-actions">
              <input
                ref="uploadInputRef"
                class="sr-only-input"
                type="file"
                accept="image/*"
                @change="handleFileChange"
              />
              <button
                type="button"
                class="settings-button success trigger-upload-btn"
                :disabled="uploading"
                @click="triggerUpload"
              >
                {{ uploading ? t('common.loading') : t('settings.uploadBtn') }}
              </button>
            </div>

            <div class="asset-preview-grid">
              <div class="asset-preview-card" data-current-asset="logoUrl">
                <div class="asset-preview-header">
                  <span class="asset-preview-label">{{ t('settings.logoUrl') }}</span>
                  <button
                    v-if="settings.logoUrl"
                    type="button"
                    class="settings-chip ghost clear-asset-btn"
                    @click="clearAsset('logoUrl')"
                  >
                    {{ t('settings.resetAsset') }}
                  </button>
                </div>
                <div v-if="settings.logoUrl" class="media-preview asset-media-frame">
                  <img :src="settings.logoUrl" class="logo-preview" alt="Logo Preview" />
                </div>
                <div v-else class="asset-preview-empty">{{ t('settings.notConfigured') }}</div>
              </div>

              <div class="asset-preview-card" data-current-asset="faviconUrl">
                <div class="asset-preview-header">
                  <span class="asset-preview-label">{{ t('settings.favicon') }}</span>
                  <button
                    v-if="settings.faviconUrl"
                    type="button"
                    class="settings-chip ghost clear-asset-btn"
                    @click="clearAsset('faviconUrl')"
                  >
                    {{ t('settings.resetAsset') }}
                  </button>
                </div>
                <div v-if="settings.faviconUrl" class="media-preview asset-media-frame compact">
                  <img :src="settings.faviconUrl" class="favicon-preview" alt="Favicon Preview" />
                </div>
                <div v-else class="asset-preview-empty">{{ t('settings.notConfigured') }}</div>
              </div>

              <div class="asset-preview-card" data-current-asset="backgroundUrl">
                <div class="asset-preview-header">
                  <span class="asset-preview-label">{{ t('settings.bgUrl') }}</span>
                  <button
                    v-if="settings.backgroundUrl"
                    type="button"
                    class="settings-chip ghost clear-asset-btn"
                    @click="clearAsset('backgroundUrl')"
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
                @delete="deleteFile"
                @apply="applyUploadedFile"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <div class="section-head">
          <h3 class="section-title">{{ t('settings.themeSettings') }}</h3>
          <p class="section-copy">{{ t('settings.themeTip') }}</p>
        </div>

        <div class="section-fields">
          <label class="setting-block" data-setting-field="themePreset">
            <span class="setting-label">{{ t('settings.themePreset') }}</span>
            <span class="form-tip">{{ t('settings.themePresetTip') }}</span>
            <AppSelect v-model="settings.themePreset" class="settings-select">
              <option
                v-for="option in themePresetOptions"
                :key="String(option.value)"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </AppSelect>
          </label>

          <label class="setting-block" data-setting-field="themeColor">
            <span class="setting-label">{{ t('settings.themeColor') }}</span>
            <span class="form-tip">{{ t('settings.themeColorTip') }}</span>
            <input
              v-model="settings.themeColor"
              class="settings-input"
              :placeholder="t('settings.themeColorPlaceholder')"
              autocomplete="off"
              spellcheck="false"
            />
            <div class="theme-preview">
              <span class="theme-swatch" :style="{ backgroundColor: previewAccentColor }"></span>
              <span class="theme-preview-copy">
                {{ settings.themeColor || t('settings.themeColorAuto') }}
              </span>
            </div>
          </label>
        </div>
      </section>

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
import AppSelect from '@/components/AppSelect.vue'
import UploadedFilesPanel from '@/components/admin/settings/UploadedFilesPanel.vue'
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
  themePresetOptions,
  previewAccentColor,
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
@import './SystemSettings.scss';
</style>
