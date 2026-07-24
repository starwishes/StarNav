import { DIALOG_ICONS, DIALOG_ROOT_ID } from './constants'
import { ensureRoot, ensureStyles, hasDOM, normalizeText, onNextFrame } from './dom'
import type { DialogController, DialogKind, DialogOptions, MessageType } from './types'

const dialogStack: DialogController[] = []

const normalizeDialogOptions = (input: unknown) => {
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    const options = input as DialogOptions
    return {
      type: options.type || 'info',
      confirmButtonText: options.confirmButtonText || '确定',
      cancelButtonText: options.cancelButtonText || '取消',
      showClose: Boolean(options.showClose),
      closeOnClickModal: options.closeOnClickModal !== false,
      inputValue: typeof options.inputValue === 'string' ? options.inputValue : '',
      inputPlaceholder:
        typeof options.inputPlaceholder === 'string' ? options.inputPlaceholder : '',
      inputType: typeof options.inputType === 'string' ? options.inputType : 'text'
    }
  }

  return {
    type: 'info' as MessageType,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    showClose: false,
    closeOnClickModal: true,
    inputValue: '',
    inputPlaceholder: '',
    inputType: 'text'
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
    return Promise.resolve(kind === 'prompt' ? { value: '', action: 'close' } : 'close')
  }

  ensureStyles()
  const root = ensureRoot(DIALOG_ROOT_ID)
  if (!root) {
    return Promise.resolve(kind === 'prompt' ? { value: '', action: 'close' } : 'close')
  }

  const normalized = normalizeDialogOptions(options)
  const dialogTitle = normalizeText(title) || (kind === 'alert' ? '提示' : '确认操作')
  const dialogMessage = normalizeText(message)

  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div')
    overlay.className = 'sn-feedback-dialog-backdrop'
    overlay.style.zIndex = String(4200 + dialogStack.length * 2)

    const dialog = document.createElement('div')
    dialog.className = `sn-feedback-dialog is-${normalized.type}`
    dialog.setAttribute('role', kind === 'alert' ? 'alertdialog' : 'dialog')
    dialog.setAttribute('aria-modal', 'true')

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
    titleEl.textContent = dialogTitle

    const messageEl = document.createElement('p')
    messageEl.className = 'sn-feedback-dialog-message'
    messageEl.textContent = dialogMessage

    copy.append(titleEl, messageEl)
    head.append(icon, copy)

    let closeButton: HTMLButtonElement | null = null
    if (normalized.showClose) {
      closeButton = document.createElement('button')
      closeButton.type = 'button'
      closeButton.className = 'sn-feedback-dialog-close'
      closeButton.setAttribute('aria-label', '关闭对话框')
      closeButton.textContent = '×'
      head.appendChild(closeButton)
    }

    body.appendChild(head)

    let inputEl: HTMLInputElement | null = null
    if (kind === 'prompt') {
      inputEl = document.createElement('input')
      inputEl.className = 'sn-feedback-dialog-input'
      inputEl.value = normalized.inputValue
      inputEl.placeholder = normalized.inputPlaceholder
      inputEl.type = normalized.inputType
      body.appendChild(inputEl)
    }

    const footer = document.createElement('div')
    footer.className = 'sn-feedback-dialog-footer'

    const cancelButton = document.createElement('button')
    cancelButton.type = 'button'
    cancelButton.className = 'sn-feedback-dialog-button ghost'
    cancelButton.textContent = kind === 'alert' ? '关闭' : normalized.cancelButtonText

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

    const finish = (resolver: (value: unknown) => void, value: unknown) => {
      if (settled) return
      settled = true
      document.removeEventListener('keydown', handleKeydown)
      const stackIndex = dialogStack.indexOf(controller)
      if (stackIndex > -1) {
        dialogStack.splice(stackIndex, 1)
      }
      removeDialog(overlay)
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
      if (kind === 'prompt') {
        finish(resolve, {
          value: inputEl?.value ?? '',
          action: 'confirm'
        })
        return
      }
      finish(resolve, 'confirm')
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        dismiss()
      }
      if (event.key === 'Enter' && kind === 'prompt' && event.target === inputEl) {
        event.preventDefault()
        confirm()
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
    document.addEventListener('keydown', handleKeydown)

    onNextFrame(() => {
      overlay.classList.add('is-visible')
      if (inputEl) {
        inputEl.focus()
        inputEl.select()
      } else {
        confirmButton.focus()
      }
    })
  })
}

export const closeActiveDialog = () => {
  const current = dialogStack[dialogStack.length - 1]
  current?.dismiss()
}
