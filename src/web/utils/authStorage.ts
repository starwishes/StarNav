import type { AuthUser } from '@/types'

/**
 * admin_user localStorage 的唯一读写出口。
 *
 * 注意：该值仅来自 localStorage（客户端可任意篡改），只是用于前端的
 * UX 引导（登录弹窗/路由守卫）；真正的授权由服务端
 * authenticate/requireAdmin 中间件在每个 API 上强制执行。
 */
const AUTH_STORAGE_KEY = 'admin_user'

export const authStorage = {
  get key() {
    return AUTH_STORAGE_KEY
  },

  /** 读取并解析已持久化的用户提示；损坏/缺失返回 null。 */
  read(): AuthUser | null {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  },

  write(user: AuthUser) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  },

  clear() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}
