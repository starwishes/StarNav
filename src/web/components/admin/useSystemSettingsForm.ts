import { computed, reactive, ref, watch } from 'vue'

import type { SystemSettings as SystemSettingsModel } from '@/api'

import {
  buildDefaultFooterHtml,
  buildDefaultLevelOptions,
  buildTimezoneOptions,
  createSystemSettingsDraft,
  syncSystemSettingsDraft
} from '@/components/admin/systemSettingsHelpers'
import { useSystemAssetManagement } from '@/composables/admin/useSystemAssetManagement'

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
    fillDefaultFooter,
    saveSettings
  }
}
