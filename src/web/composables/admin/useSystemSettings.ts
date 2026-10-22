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
  const settingsLoadError = ref(false)

  /**
   * 获取系统设置
   */
  const fetchSettings = async () => {
    settingsLoadError.value = false
    try {
      systemSettings.value = await adminStore.getAdminSettings()
    } catch (error) {
      // 失败不再只弹瞬态 toast 后落空表单（保存会被服务端 min(1) 400 拦）：
      // 置 loadError 渲染错误态 + 重试入口（第 35 轮 G2，与用户/会话列表同型）。
      settingsLoadError.value = true
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
    settingsLoadError,
    fetchSettings,
    handleSaveSettings
  }
}
