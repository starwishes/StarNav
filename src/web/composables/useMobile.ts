import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Viewport-based mobile flag (sidebar / chrome layout).
 * Prefer CSS container queries for content-pane tables and toolbars.
 */
export function useMobile(breakpoint = 768) {
  const isMobile = ref(false)
  let mediaQuery: MediaQueryList | null = null

  const sync = () => {
    if (mediaQuery) {
      isMobile.value = mediaQuery.matches
      return
    }
    isMobile.value = window.innerWidth <= breakpoint
  }

  const onChange = () => sync()

  onMounted(() => {
    if (typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)
      sync()
      mediaQuery.addEventListener('change', onChange)
      return
    }

    sync()
    window.addEventListener('resize', onChange)
  })

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', onChange)
      return
    }
    window.removeEventListener('resize', onChange)
  })

  return { isMobile }
}
