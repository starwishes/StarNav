/**
 * 语言切换按钮图标（v-html 渲染的静态字符串）。
 * 集中维护，避免 AdminHeader / PageHeader 各存一份导致 v-html 源漂移。
 */
export const buildLangIconHtml = (locale: string): string =>
  locale === 'zh-CN' ? '文<sub>A</sub>' : 'A<sub>文</sub>'
