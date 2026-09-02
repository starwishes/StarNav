import { ref } from 'vue'
import { ElMessage } from '@/utils/feedback'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/store/admin'
import { useConfigStore } from '@/store/config'
import type { SystemSettings } from '@/api'
import { getErrorMessage } from '@/utils/errors'

/**
 * 系统设置 Composable
 * 负责系统配置的获取和更新
 */
export function useSystemSettings() {
  const { t } = useI18n()
  const adminStore = useAdminStore()
  const configStore = useConfigStore()

  const systemSettings = ref<Partial<SystemSettings>>({})

  /**
   * 获取系统设置
   */
  const fetchSettings = async () => {
    try {
      systemSettings.value = await adminStore.getAdminSettings()
    } catch (error) {
      ElMessage.error(getErrorMessage(error, t('common.loadFailed')))
    }
  }

  /**
   * 保存系统设置
   */
  const handleSaveSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const res = await adminStore.updateAdminSettings(newSettings)
      if (res.success) {
        ElMessage.success(t('settings.saveSuccess'))
        configStore.updateConfig(newSettings)
        return
      }

      ElMessage.error(getErrorMessage(res, t('common.fail')))
    } catch (error) {
      ElMessage.error(getErrorMessage(error, t('common.fail')))
    }
  }

  return {
    systemSettings,
    fetchSettings,
    handleSaveSettings
  }
}
