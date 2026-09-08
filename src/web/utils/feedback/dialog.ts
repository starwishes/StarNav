import { DIALOG_ICONS, DIALOG_ROOT_ID } from './constants'
import { ensureRoot, ensureStyles, hasDOM, normalizeText, onNextFrame } from './dom'
import { feedbackText } from './locale'
import type { DialogController, DialogKind, DialogOptions, MessageType } from './types'

const dialogStack: DialogController[] = []

// 弹层可访问名/描述的稳定 id 计数：id 只需在 DOM 存活期间唯一，
// 单调递增即可（关闭后的旧 id 不再被引用，无需回收）。
let dialogInstanceCounter = 0

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

const normalizeDialogOptions = (input: unknown) => {
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    const options = input as DialogOptions
    return {
      type: options.type || 'info',
      confirmButtonText: options.confirmButtonText || feedbackText('feedback.confirm'),
      cancelButtonText: options.cancelButtonText || feedbackText('feedback.cancel'),
      showClose: Boolean(options.showClose),
      closeOnClickModal: options.closeOnClickModal !== false
    }
  }

  return {
    type: 'info' as MessageType,
    confirmButtonText: feedbackText('feedback.confirm'),
    cancelButtonText: feedbackText('feedback.cancel'),
    showClose: false,
    closeOnClickModal: true
  }
}

const removeDialog = (overlay: HTMLElement) => {
  overlay.classList.remove('is-visible')
  window.setTimeout(() => {
    overlay.remove()
  }, 180)
}

export const openDialog = (
  kind: DialogKind,
  message: unknown,
  title?: unknown,
  options?: unknown
) => {
  if (!hasDOM()) {
    return Promise.resolve('close')
  }

  ensureStyles()
  const root = ensureRoot(DIALOG_ROOT_ID)
  if (!root) {
    return Promise.resolve('close')
  }

  const normalized = normalizeDialogOptions(options)
  const dialogTitle =
    normalizeText(title) ||
    feedbackText(kind === 'alert' ? 'feedback.alert' : 'feedback.confirmAction')
  const dialogMessage = normalizeText(message)

  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div')
    overlay.className = 'sn-feedback-dialog-backdrop'
    overlay.style.zIndex = String(4200 + dialogStack.length * 2)

    const dialog = document.createElement('div')
    dialog.className = `sn-feedback-dialog is-${normalized.type}`
    dialog.setAttribute('role', kind === 'alert' ? 'alertdialog' : 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    // 自绘弹层必须有可访问名/描述：给标题与消息元素生成稳定 id 并挂
    // aria-labelledby/describedby，否则读屏会把整段文本当无名弹层播报
    //（第 34 轮盲审 L2）。
    const dialogInstanceId = ++dialogInstanceCounter
    const titleId = `sn-feedback-dialog-title-${dialogInstanceId}`
    const messageId = `sn-feedback-dialog-message-${dialogInstanceId}`

    const body = document.createElement('div')
    body.className = 'sn-feedback-dialog-body'

    const head = document.createElement('div')
    head.className = 'sn-feedback-dialog-head'

    const icon = document.createElement('span')
    icon.className = 'sn-feedback-dialog-icon'
    icon.textContent = DIALOG_ICONS[normalized.type]

    const copy = document.createElement('div')
    copy.className = 'sn-feedback-dialog-copy'

    const titleEl = document.createElement('h3')
    titleEl.className = 'sn-feedback-dialog-title'
    titleEl.id = titleId
    titleEl.textContent = dialogTitle

    const messageEl = document.createElement('p')
    messageEl.className = 'sn-feedback-dialog-message'
    messageEl.id = messageId
    messageEl.textContent = dialogMessage

    copy.append(titleEl, messageEl)
    head.append(icon, copy)

    dialog.setAttribute('aria-labelledby', titleId)
    // 消息为空时不必挂 describedby（空引用不会带来有用信息）
    if (dialogMessage) {
      dialog.setAttribute('aria-describedby', messageId)
    }

    let closeButton: HTMLButtonElement | null = null
    if (normalized.showClose) {
      closeButton = document.createElement('button')
      closeButton.type = 'button'
      closeButton.className = 'sn-feedback-dialog-close'
      closeButton.setAttribute('aria-label', feedbackText('feedback.close'))
      closeButton.textContent = '×'
      head.appendChild(closeButton)
    }

    body.appendChild(head)

    const footer = document.createElement('div')
    footer.className = 'sn-feedback-dialog-footer'

    const cancelButton = document.createElement('button')
    cancelButton.type = 'button'
    cancelButton.className = 'sn-feedback-dialog-button ghost'
    cancelButton.textContent =
      kind === 'alert' ? feedbackText('feedback.close') : normalized.cancelButtonText

    const confirmButton = document.createElement('button')
    confirmButton.type = 'button'
    confirmButton.className = 'sn-feedback-dialog-button primary'
    confirmButton.textContent = normalized.confirmButtonText

    if (kind === 'alert') {
      footer.append(confirmButton)
    } else {
      footer.append(cancelButton, confirmButton)
    }

    dialog.append(body, footer)
    overlay.appendChild(dialog)
    root.appendChild(overlay)

    let settled = false
    // 记录打开前的焦点元素，关闭后归还（焦点陷阱的一部分）。
    const triggerToRestore =
      hasDOM() && document.activeElement instanceof HTMLElement ? document.activeElement : null

    const finish = (resolver: (value: unknown) => void, value: unknown) => {
      if (settled) return
      settled = true
      document.removeEventListener('keydown', handleKeydown, true)
      dialog.removeEventListener('keydown', trapFocus)
      const stackIndex = dialogStack.indexOf(controller)
      if (stackIndex > -1) {
        dialogStack.splice(stackIndex, 1)
      }
      removeDialog(overlay)
      triggerToRestore?.focus()
      resolver(value)
    }

    const dismiss = () => {
      if (kind === 'alert') {
        finish(resolve, 'close')
        return
      }
      finish(reject, 'cancel')
    }

    const controller: DialogController = {
      dismiss
    }
    dialogStack.push(controller)

    const confirm = () => {
      finish(resolve, 'confirm')
    }

    // 捕获阶段监听 + 只让栈顶弹层消费 Esc：下层弹窗/页面级 Esc 处理器
    // 不会在同一事件里被触发，避免"反馈弹层 Esc 连带关闭表单弹窗"。
    const handleKeydown = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== controller) {
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dismiss()
      }
    }

    // 焦点陷阱：Tab/Shift+Tab 只在弹层内循环。
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
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

    confirmButton.addEventListener('click', confirm)
    cancelButton.addEventListener('click', dismiss)
    closeButton?.addEventListener('click', dismiss)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay && normalized.closeOnClickModal) {
        dismiss()
      }
    })
    dialog.addEventListener('keydown', trapFocus)
    document.addEventListener('keydown', handleKeydown, true)

    onNextFrame(() => {
      overlay.classList.add('is-visible')
      confirmButton.focus()
    })
  })
}

export const closeActiveDialog = () => {
  const current = dialogStack[dialogStack.length - 1]
  current?.dismiss()
}
