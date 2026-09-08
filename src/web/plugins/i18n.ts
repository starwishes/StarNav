import { createI18n } from 'vue-i18n'
import zhCN from '@/locales/zh-CN.json'
import enUS from '@/locales/en-US.json'

// 获取保存的语言设置，默认中文。localStorage 在禁用站点数据/隐私模式下读取会抛
// SecurityError——模块加载期（早于 Vue mount）任何未捕获异常都会让整站白屏
//（第 34 轮盲审 L5），因此读写都降级为默认值。
const readStoredLocale = (): string => {
  try {
    return localStorage.getItem('locale') || 'zh-CN'
  } catch {
    return 'zh-CN'
  }
}

const savedLocale = readStoredLocale()

// 初始化时同步 document.lang（切换路径由 setLocale 维护）。
// 浏览器可基于该属性展示本地化界面/校验提示；仅初始化一次。
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('lang', savedLocale === 'zh-CN' ? 'zh-CN' : 'en')
}

const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: savedLocale,
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

// 语言切换后的 document.title 刷新回调；由 router 模块注册（router 持有当前路由的
// meta.titleKey 与站点名，能按当前页面重算标题）。i18n 不反向 import router，避免
// 循环依赖；setLocale 只负责触发。
let titleRefreshHandler: (() => void) | null = null

export const registerTitleRefreshHandler = (handler: () => void) => {
  titleRefreshHandler = handler
}

// 切换语言的方法
export const setLocale = (locale: 'zh-CN' | 'en-US') => {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem('locale', locale)
  } catch {
    // 存储不可用：本次选择仅影响当前会话
  }
  document.documentElement.setAttribute('lang', locale === 'zh-CN' ? 'zh-CN' : 'en')
  // 原地切换语言时按当前路由重算 document.title（导航时由 router 守卫更新）
  titleRefreshHandler?.()
}

// 获取当前语言
export const getLocale = () => i18n.global.locale.value

export default i18n
