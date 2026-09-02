/* global document, localStorage, window */
;(() => {
  const root = document.documentElement

  try {
    const stored = localStorage.getItem('theme-mode')
    // 首访无存储值：跟随系统偏好（与扩展端一致），避免深色系统用户首屏闪白。
    const mode =
      stored === 'dark' ||
      (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'light'
    root.setAttribute('theme-mode', mode)

    if (mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  } catch {
    root.setAttribute('theme-mode', 'light')
    root.classList.remove('dark')
  }
})()
