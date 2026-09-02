import { defineComponent, h, ref, type Ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDialogA11y, type UseDialogA11yOptions } from '@/composables/useDialogA11y'

interface Harness {
  wrapper: ReturnType<typeof mount>
  dialog: HTMLDivElement
  buttons: HTMLButtonElement[]
  outside: HTMLButtonElement
  trigger: HTMLButtonElement
  isOpen: Ref<boolean>
  onClose: ReturnType<typeof vi.fn>
}

const createHarness = (options: Partial<UseDialogA11yOptions> = {}): Harness => {
  const isOpen = ref(false)
  const onClose = vi.fn()

  const dialog = document.createElement('div')
  dialog.setAttribute('data-test', 'dialog')
  // tabindex=-1：可被 programmatic focus 又不出现在 Tab 序列里（与真实弹窗一致）
  dialog.setAttribute('tabindex', '-1')
  const buttons = [1, 2, 3].map((n) => {
    const btn = document.createElement('button')
    btn.textContent = `btn-${n}`
    dialog.appendChild(btn)
    return btn
  })

  const trigger = document.createElement('button')
  trigger.textContent = 'trigger'
  const outside = document.createElement('button')
  outside.textContent = 'outside'
  document.body.append(trigger, dialog, outside)

  const Harness = defineComponent({
    setup() {
      useDialogA11y({
        isOpen,
        getDialog: () => dialog,
        onClose,
        ...options
      })
      return () => h('div')
    }
  })

  const wrapper = mount(Harness)
  return { wrapper, dialog, buttons, outside, trigger, isOpen, onClose }
}

const openDialog = async (h: Harness) => {
  h.isOpen.value = true
  await flushPromises()
}

const closeDialog = async (h: Harness) => {
  h.isOpen.value = false
  await flushPromises()
}

describe('useDialogA11y', () => {
  const mountedWrappers: Array<ReturnType<typeof mount>> = []

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('focuses the dialog container when opened', async () => {
    const h = createHarness()
    mountedWrappers.push(h.wrapper)
    h.trigger.focus()

    await openDialog(h)

    expect(document.activeElement).toBe(h.dialog)
  })

  it('focuses the getInitialFocus element instead of the container', async () => {
    const h = createHarness({ getInitialFocus: () => h.buttons[1] })
    mountedWrappers.push(h.wrapper)

    await openDialog(h)

    expect(document.activeElement).toBe(h.buttons[1])
  })

  it('wraps Tab / Shift+Tab at the first and last focusables', async () => {
    const h = createHarness()
    mountedWrappers.push(h.wrapper)
    await openDialog(h)

    // Tab from the last element wraps to the first
    h.buttons[2].focus()
    h.buttons[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(h.buttons[0])

    // Shift+Tab from the first element wraps to the last
    h.buttons[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
    )
    expect(document.activeElement).toBe(h.buttons[2])
  })

  it('pulls focus back into the dialog when Tab is pressed while focus is outside', async () => {
    const h = createHarness()
    mountedWrappers.push(h.wrapper)
    await openDialog(h)

    // 焦点在弹窗外的元素上：Tab 拉回首个、Shift+Tab 拉回末个
    h.outside.focus()
    h.dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(h.buttons[0])

    h.outside.focus()
    h.dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
    )
    expect(document.activeElement).toBe(h.buttons[2])
  })

  it('triggers onClose on Escape and stops propagation to document listeners', async () => {
    const h = createHarness()
    mountedWrappers.push(h.wrapper)
    await openDialog(h)

    const onDocumentKeydown = vi.fn()
    document.addEventListener('keydown', onDocumentKeydown)

    h.dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(h.onClose).toHaveBeenCalledTimes(1)
    // 焦点在弹窗内时不应再冒泡触发组件的文档级 Esc 处理器（防重复 close）
    expect(onDocumentKeydown).not.toHaveBeenCalled()

    document.removeEventListener('keydown', onDocumentKeydown)
  })

  it('restores focus to the trigger element after close', async () => {
    const h = createHarness()
    mountedWrappers.push(h.wrapper)
    h.trigger.focus()

    await openDialog(h)
    expect(document.activeElement).toBe(h.dialog)

    await closeDialog(h)
    expect(document.activeElement).toBe(h.trigger)
  })

  it('removes the keydown listener on unmount', async () => {
    const h = createHarness()
    mountedWrappers.push(h.wrapper)
    await openDialog(h)
    expect(h.onClose).not.toHaveBeenCalled()

    h.onClose.mockClear()
    h.wrapper.unmount()
    h.dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(h.onClose).not.toHaveBeenCalled()
  })
})
