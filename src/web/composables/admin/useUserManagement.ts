import { ref } from 'vue'
import { ElMessage } from '@/utils/feedback'
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

  /**
   * 获取用户列表
   */
  const fetchUserList = async () => {
    users.value = await adminStore.fetchUsers()
  }

  /**
   * 更新用户权限级别
   */
  const handleUpdateUserLevel = async (username: string, level: number) => {
    const res = await adminStore.updateUser(username, { level })
    if (res.success) {
      ElMessage.success(t('admin.updateSuccess'))
      fetchUserList()
    } else {
      ElMessage.error(res.error || t('admin.operationFailed'))
    }
  }

  /**
   * 添加用户
   */
  const handleAddUser = async (userData: {
    username: string
    password: string
    level?: number
  }) => {
    const res = await adminStore.addUser(userData)
    if (res.success) {
      ElMessage.success(t('admin.addSuccess'))
      fetchUserList()
    } else {
      ElMessage.error(res.error || t('admin.operationFailed'))
    }
  }

  /**
   * 删除用户
   */
  const handleDeleteUser = async (username: string) => {
    const res = await adminStore.deleteUser(username)
    if (res.success) {
      ElMessage.success(t('admin.deleteSuccess'))
      fetchUserList()
    } else {
      ElMessage.error(res.error || t('admin.operationFailed'))
    }
  }

  /**
   * 更新用户信息
   */
  const handleUpdateUser = async (
    oldUsername: string,
    updateData: Partial<ApiUser & { password?: string; newUsername?: string }>
  ) => {
    const res = await adminStore.updateUser(oldUsername, updateData)
    if (res.success) {
      ElMessage.success(t('admin.updateSuccess'))
      fetchUserList()
    } else {
      ElMessage.error(res.error || t('admin.operationFailed'))
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
