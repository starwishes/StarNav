import { nextTick, watch, type Ref } from 'vue'

/** Focus dialog shell / first input when a teleported modal opens. */
export function useFocusOnOpen(
  isOpen: Ref<boolean> | (() => boolean),
  ...getElements: Array<() => HTMLElement | null | undefined>
) {
  const readOpen = typeof isOpen === 'function' ? isOpen : () => isOpen.value

  watch(
    readOpen,
    (open) => {
      if (!open) return
      nextTick(() => {
        for (const getEl of getElements) {
          getEl()?.focus()
        }
      })
    }
  )
}
