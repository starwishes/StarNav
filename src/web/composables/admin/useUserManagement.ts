import { ref } from 'vue'
import { ElMessage } from '@/utils/feedback'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/store/admin'
import type { User as ApiUser } from '@/api'

/**
 * 用户管理 Composable
 * 负责用户的增删改查和权限管理
 */
export function useUserManagement() {
  const { t } = useI18n()
  const adminStore = useAdminStore()

  const users = ref<ApiUser[]>([])

  const fetchUserList = async () => {
    users.value = await adminStore.fetchUsers()
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
      await fetchUserList()
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
      adminStore.setAuth(
        adminStore.token || '',
        {
          login: updateData.newUsername,
          name: updateData.newUsername,
          level: adminStore.user.level
        }
      )
    }
  }

  return {
    users,
    fetchUserList,
    handleUpdateUserLevel,
    handleAddUser,
    handleDeleteUser,
    handleUpdateUser
  }
}
