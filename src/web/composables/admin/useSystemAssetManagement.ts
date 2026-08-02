import { computed, onMounted, ref, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from '@/utils/feedback'
import { useI18n } from 'vue-i18n'
import { adminApi, type UploadedFile } from '@/api/admin'
import { getErrorMessage } from '@/utils/errors'
import { createScopedLogger } from '../../../shared/logger.js'

type AssetField = 'backgroundUrl' | 'faviconUrl' | 'logoUrl'

interface AssetSettingsState {
  backgroundUrl?: string
  faviconUrl?: string
  logoUrl?: string
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))

    reader.readAsDataURL(file)
  })

export function useSystemAssetManagement(
  settings: AssetSettingsState,
  uploadInputRef: Ref<HTMLInputElement | null>
) {
  const { t } = useI18n()
  const logger = createScopedLogger('web:asset-management')

  const uploading = ref(false)
  const uploadedFiles = ref<UploadedFile[]>([])
  const loadingFiles = ref(false)
  const previewUrl = computed(() => settings.backgroundUrl || '')

  const triggerUpload = () => {
    uploadInputRef.value?.click()
  }

  const fetchUploadedFiles = async () => {
    loadingFiles.value = true

    try {
      uploadedFiles.value = await adminApi.getUploadedFiles()
    } catch (error) {
      logger.error('Failed to fetch uploaded files.', error)
      ElMessage.error(getErrorMessage(error, t('common.loadFailed')))
    } finally {
      loadingFiles.value = false
    }
  }

  const deleteFile = async (filename: string) => {
    try {
      await ElMessageBox.confirm(t('settings.deleteConfirm'), t('common.confirm'), {
        type: 'warning'
      })

      const data = await adminApi.deleteUpload(filename)
      if (data.success) {
        ElMessage.success(t('admin.deleteSuccess'))
        fetchUploadedFiles()
        return
      }

      ElMessage.error(typeof data.error === 'string' ? data.error : t('common.fail'))
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(getErrorMessage(error, t('common.fail')))
      }
    }
  }

  const handleFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    uploading.value = true

    try {
      const base64Data = await readFileAsDataUrl(file)
      const data = await adminApi.uploadBackgroundAsset(base64Data, file.name)

      if (data.success) {
        ElMessage.success(t('admin.addSuccess'))
        await fetchUploadedFiles()
      } else {
        ElMessage.error(typeof data.error === 'string' ? data.error : t('common.fail'))
      }
    } catch (error) {
      ElMessage.error(getErrorMessage(error, t('common.fail')))
    } finally {
      uploading.value = false
      input.value = ''
    }
  }

  const applyUploadedFile = (field: AssetField, url: string) => {
    settings[field] = url
  }

  onMounted(fetchUploadedFiles)

  return {
    uploading,
    uploadedFiles,
    loadingFiles,
    previewUrl,
    triggerUpload,
    fetchUploadedFiles,
    deleteFile,
    handleFileChange,
    applyUploadedFile
  }
}
