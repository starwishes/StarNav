import i18n from '@/plugins/i18n'

/**
 * 反馈层（feedback-core 是框架无关的 DOM 实现）从应用 i18n 读取文案，
 * 保证 en-US 界面不会冒出硬编码中文。i18n 实例不可用时回退到 key 本身。
 */
export const feedbackText = (key: string): string => {
  try {
    const value = i18n.global.t(key)
    return typeof value === 'string' && value ? value : key
  } catch {
    return key
  }
}
