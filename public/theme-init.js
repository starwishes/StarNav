/* global document, localStorage */
;(() => {
  const root = document.documentElement

  try {
    const mode = localStorage.getItem('theme-mode') === 'dark' ? 'dark' : 'light'
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
