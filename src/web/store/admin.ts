import { defineStore } from 'pinia'
import { ref } from 'vue'
import i18n from '@/plugins/i18n'
import type { AuthUser, AuthResult, User } from '@/types'
import type { SystemSettings } from '@/api'
import { adminApi } from '@/api/admin'
import { authApi } from '@/api'
import { ApiClientError } from '@/api/client'
import { authStorage } from '@/utils/authStorage'
import { getErrorMessage } from '@/utils/errors'

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
        // 2xx-但-envelope-无 user 的防御路径：服务端业务文案若用裸 Error 抛出，会被下方
        // getErrorMessage 判定为网络层异常而回退成通用文案。改以 ApiClientError(0) 携带，
        // 使其按"业务文案"放行上屏（status 0 表示非 HTTP 失败，见 errors.ts 分类规则）。
        throw new ApiClientError(
          typeof data.error === 'string' ? data.error : i18n.global.t('auth.loginFailed'),
          0
        )
      }

      setAuth(data.user as AuthUser)
      return { success: true }
    } catch (error) {
      // 网络层 TypeError/DOMException 等原生 Error 的 message（'Failed to fetch' 等）不上屏，
      // 落 auth.loginFailed 本地化 fallback；ApiClientError/纯对象失败信封/显式字符串保留原文
      const message = getErrorMessage(error, i18n.global.t('auth.loginFailed'))
      return { success: false, error: message }
    }
  }

  // 注册
  const register = async (username: string, password: string): Promise<AuthResult> => {
    try {
      await authApi.register({ username, password })
      return { success: true }
    } catch (error) {
      // 与 login 同口径：网络层异常落 auth.registerFailed fallback，业务文案保留
      const message = getErrorMessage(error, i18n.global.t('auth.registerFailed'))
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
