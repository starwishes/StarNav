import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

export interface UseDialogA11yOptions {
  /** 弹窗开关；传 Ref 或读取函数均可。 */
  isOpen: Ref<boolean> | (() => boolean)
  /** 返回弹窗容器元素（focus trap 与焦点归还作用域）。 */
  getDialog: () => HTMLElement | null | undefined
  /** 打开后聚焦的首个元素；缺省聚焦容器本身。 */
  getInitialFocus?: () => HTMLElement | null | undefined
  /** Esc 关闭回调（可选；组件仍可保留自己的文档级 Esc 处理器）。 */
  onClose?: () => void
}

/**
 * 弹窗可访问性 composable：
 * - 打开时聚焦容器/首元素
 * - Tab / Shift+Tab 在容器内循环（焦点陷阱）
 * - Esc 关闭（可选 onClose）
 * - 关闭后把焦点归还给触发元素
 *
 * 注意：事件监听挂在容器元素上，文档级 Escape 测试/处理器（直接 dispatch 在
 * document 上）不受影响，仍由组件原有处理器兜底。
 */
export function useDialogA11y(options: UseDialogA11yOptions) {
  const readOpen = () =>
    typeof options.isOpen === 'function' ? options.isOpen() : options.isOpen.value
  let restoreTarget: HTMLElement | null = null
  let cleanup: (() => void) | null = null

  const detach = () => {
    cleanup?.()
    cleanup = null
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && options.onClose) {
      // 焦点在弹窗内时，本处理器负责关闭；阻止冒泡避免同时触发组件的
      // 文档级 Esc 处理器导致重复 close。组件文档级处理器仅兜底“焦点在
      // 弹窗外”的场景（此时事件不会经过本弹窗元素）。
      event.stopPropagation()
      options.onClose()
      return
    }
    if (event.key !== 'Tab') return

    const dialog = options.getDialog()
    if (!dialog) return
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    if (focusables.length === 0) {
      event.preventDefault()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (event.shiftKey) {
      if (active === first || (active && !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last || (active && !dialog.contains(active))) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(
    readOpen,
    async (open) => {
      if (!open) {
        detach()
        if (restoreTarget) {
          restoreTarget.focus()
          restoreTarget = null
        }
        return
      }

      await nextTick()
      const dialog = options.getDialog()
      if (!dialog) return

      restoreTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.addEventListener('keydown', handleKeydown)
      cleanup = () => dialog.removeEventListener('keydown', handleKeydown)

      ;(options.getInitialFocus?.() || dialog).focus()
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    detach()
    restoreTarget?.focus()
  })

  return { restoreFocus: () => restoreTarget?.focus() }
}
