import { ref } from 'vue'
import { ElMessage } from '@/utils/feedback'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/store/admin'
import type { User as ApiUser } from '@/api'
import { createScopedLogger } from '../../../shared/logger.js'

/**
 * 用户管理 Composable
 * 负责用户的增删改查和权限管理
 */
export function useUserManagement() {
  const { t } = useI18n()
  const adminStore = useAdminStore()
  const logger = createScopedLogger('web:user-management')

  const users = ref<ApiUser[]>([])
  const usersLoadError = ref(false)

  const fetchUserList = async (options: { silent?: boolean } = {}) => {
    usersLoadError.value = false
    try {
      users.value = await adminStore.fetchUsers()
    } catch (error) {
      // 失败不再让列表停留在"无数据"空态：置 loadError 渲染错误态 + 重试入口
      //（第 35 轮 G2，与 SessionManager/AuditLog 同型漏网）。
      logger.error('Failed to fetch user list.', error)
      usersLoadError.value = true
      // 动作成功后的刷新失败走 silent：避免"操作成功 + 加载失败"矛盾双 toast
      //（第 30 轮 M2 语义），但仍置错误态供用户手动重试。
      if (!options.silent) {
        ElMessage.error(t('common.loadFailed'))
      }
    }
  }

  const runUserAction = async (action: () => Promise<unknown>, successKey: string) => {
    try {
      const res = (await action()) as { success?: boolean; error?: string } | undefined
      // api client throws on HTTP errors; 2xx bodies usually include success:true
      if (res && res.success === false) {
        ElMessage.error(res.error || t('admin.operationFailed'))
        return false
      }
      ElMessage.success(t(successKey))
      // 列表刷新失败 ≠ 动作失败：fetchUserList 内部降级为日志 + 错误态，
      // silent 抑制 toast，避免"操作成功+操作失败"矛盾双 toast（第 30 轮 M2）。
      await fetchUserList({ silent: true })
      return true
    } catch (error) {
      ElMessage.error(getErrorMessage(error, t('admin.operationFailed')))
      return false
    }
  }

  const handleUpdateUserLevel = async (username: string, level: number) => {
    await runUserAction(() => adminStore.updateUser(username, { level }), 'admin.updateSuccess')
  }

  const handleAddUser = async (userData: {
    username: string
    password: string
    level?: number
  }) => {
    await runUserAction(() => adminStore.addUser(userData), 'admin.addSuccess')
  }

  const handleDeleteUser = async (username: string) => {
    await runUserAction(() => adminStore.deleteUser(username), 'admin.deleteSuccess')
  }

  const handleUpdateUser = async (
    oldUsername: string,
    updateData: Partial<ApiUser & { password?: string; newUsername?: string }>
  ) => {
    const ok = await runUserAction(
      () => adminStore.updateUser(oldUsername, updateData),
      'admin.updateSuccess'
    )

    // If the signed-in admin renamed themselves, keep local session label in sync.
    if (
      ok &&
      updateData.newUsername &&
      updateData.newUsername !== oldUsername &&
      adminStore.user?.login === oldUsername
    ) {
      adminStore.setAuth({
        login: updateData.newUsername,
        name: updateData.newUsername,
        level: adminStore.user.level
      })
    }
  }

  return {
    users,
    usersLoadError,
    fetchUserList,
    handleUpdateUserLevel,
    handleAddUser,
    handleDeleteUser,
    handleUpdateUser
  }
}
