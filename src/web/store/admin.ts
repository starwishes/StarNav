import { defineStore } from 'pinia'
import { ref } from 'vue'
import i18n from '@/plugins/i18n'
import type { AuthUser, AuthResult, User } from '@/types'
import type { SystemSettings } from '@/api'
import { adminApi } from '@/api/admin'
import { authApi } from '@/api'
import { authStorage } from '@/utils/authStorage'

export const useAdminStore = defineStore('admin', () => {
  const user = ref<AuthUser | null>(authStorage.read())
  const isAuthenticated = ref<boolean>(!!user.value)

  // 会话由 HttpOnly Cookie 承载，前端无需持有/传递 token
  const setAuth = (newUser: AuthUser) => {
    user.value = newUser
    isAuthenticated.value = true
    authStorage.write(newUser)
  }

  // 清除认证信息
  const clearAuth = () => {
    user.value = null
    isAuthenticated.value = false
    authStorage.clear()
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // 本地清理优先于远端响应，避免残留失效登录态
    } finally {
      clearAuth()
    }
  }

  // 登录
  const login = async (
    username: string,
    password: string,
    remember = false
  ): Promise<AuthResult> => {
    try {
      const data = await authApi.login({ username, password, remember })
      if (!data.user) {
        throw new Error(
          typeof data.error === 'string' ? data.error : i18n.global.t('auth.loginFailed')
        )
      }

      setAuth(data.user as AuthUser)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : i18n.global.t('auth.loginFailed')
      return { success: false, error: message }
    }
  }

  // 注册
  const register = async (username: string, password: string): Promise<AuthResult> => {
    try {
      await authApi.register({ username, password })
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : i18n.global.t('auth.registerFailed')
      return { success: false, error: message }
    }
  }

  // 管理员获取设置
  const getAdminSettings = async (): Promise<SystemSettings> => adminApi.getAdminSettings()

  // 管理员更新设置
  const updateAdminSettings = async (settings: Partial<SystemSettings>) =>
    adminApi.updateAdminSettings(settings)

  // 管理员获取用户列表
  const fetchUsers = async (): Promise<User[]> => adminApi.getUsers()

  // 管理员添加用户
  const addUser = async (userData: { username: string; password: string; level?: number }) =>
    adminApi.addUser(userData)

  // 管理员删除用户
  const deleteUser = async (username: string) => adminApi.deleteUser(username)

  // 管理员更新用户 (等级、用户名、密码)
  const updateUser = async (
    oldUsername: string,
    updateData: Partial<User & { password?: string; newUsername?: string }>
  ) => adminApi.updateUser(oldUsername, updateData)

  return {
    user,
    isAuthenticated,
    setAuth,
    clearAuth,
    logout,
    login,
    register,
    getAdminSettings,
    updateAdminSettings,
    fetchUsers,
    addUser,
    deleteUser,
    updateUser
  }
})
