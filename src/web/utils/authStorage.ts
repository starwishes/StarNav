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

  // 写/清与 read() 同族：禁用站点数据/隐私模式下 localStorage 会抛
  // SecurityError。登录成功路径若在此抛错会被 LoginDialog 当登录失败处理
  //（此时服务端 cookie 已建），401 清态也会中断——故一律降级不阻断主流程
  //（第 35 轮 G1，34 轮 L5 同族漏网）。
  write(user: AuthUser) {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    } catch {
      // 存储不可用/配额满：该值仅用于跨会话 UX 引导，失败静默
    }
  },

  clear() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // 存储不可用：清态由内存 store 承担，失败静默
    }
  }
}
