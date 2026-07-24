import { computed, reactive, ref, watch } from 'vue'

import type { SystemSettings as SystemSettingsModel } from '@/api'

import {
  buildDefaultFooterHtml,
  buildDefaultLevelOptions,
  buildThemePresetOptions,
  buildTimezoneOptions,
  createSystemSettingsDraft,
  syncSystemSettingsDraft
} from '@/components/admin/systemSettingsHelpers'
import { useSystemAssetManagement } from '@/composables/admin/useSystemAssetManagement'
import { resolveThemeTokens } from '@/utils/theme'

type SystemSettingsEmit = (event: 'save', settings: Partial<SystemSettingsModel>) => void

export const useSystemSettingsForm = (
  initialSettings: () => Partial<SystemSettingsModel>,
  emit: SystemSettingsEmit,
  t: (key: string) => string
) => {
  const settings = reactive<Partial<SystemSettingsModel>>(
    createSystemSettingsDraft(initialSettings())
  )
  const uploadInputRef = ref<HTMLInputElement | null>(null)

  const {
    uploading,
    uploadedFiles,
    loadingFiles,
    previewUrl,
    triggerUpload,
    fetchUploadedFiles,
    deleteFile,
    handleFileChange,
    applyUploadedFile
  } = useSystemAssetManagement(settings, uploadInputRef)

  const defaultLevelOptions = computed(() => buildDefaultLevelOptions(t))
  const timezoneOptions = computed(() => buildTimezoneOptions(t))
  const themePresetOptions = computed(() => buildThemePresetOptions(t))
  const previewAccentColor = computed(
    () => resolveThemeTokens(settings.themePreset, settings.themeColor).accentColor
  )

  watch(
    initialSettings,
    (value) => {
      syncSystemSettingsDraft(settings, value)
    },
    { deep: true, immediate: true }
  )

  const fillDefaultFooter = () => {
    settings.footerHtml = buildDefaultFooterHtml(settings.siteName, t('notification.siteName'))
  }

  const saveSettings = () => {
    emit('save', { ...settings })
  }

  return {
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
  }
}
