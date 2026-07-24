import { TOAST_ICONS, TOAST_ROOT_ID } from './constants'
import { ensureRoot, ensureStyles, hasDOM, normalizeText, onNextFrame } from './dom'
import type { MessageHandle, MessageOptions, MessageType } from './types'

const activeToastClosers = new Set<() => void>()

const normalizeMessageOptions = (input: unknown) => {
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    const options = input as MessageOptions
    return {
      message: normalizeText(options.message),
      duration: Number.isFinite(options.duration) ? Number(options.duration) : 3000,
      showClose: Boolean(options.showClose)
    }
  }

  return {
    message: normalizeText(input),
    duration: 3000,
    showClose: false
  }
}

export const createToast = (type: MessageType, input: unknown): MessageHandle => {
  if (!hasDOM()) {
    return { close() {} }
  }

  ensureStyles()
  const root = ensureRoot(TOAST_ROOT_ID)
  if (!root) {
    return { close() {} }
  }

  const { message, duration, showClose } = normalizeMessageOptions(input)
  const toast = document.createElement('article')
  toast.className = `sn-feedback-toast is-${type}`

  const icon = document.createElement('span')
  icon.className = 'sn-feedback-toast-icon'
  icon.textContent = TOAST_ICONS[type]

  const content = document.createElement('div')
  content.className = 'sn-feedback-toast-content'
  content.textContent = message

  toast.append(icon, content)

  let closed = false
  let timer = 0

  const close = () => {
    if (closed) return
    closed = true
    activeToastClosers.delete(close)
    window.clearTimeout(timer)
    toast.classList.add('is-closing')
    window.setTimeout(() => {
      toast.remove()
    }, 180)
  }

  if (showClose) {
    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.className = 'sn-feedback-toast-close'
    closeButton.setAttribute('aria-label', '关闭提示')
    closeButton.textContent = '×'
    closeButton.addEventListener('click', close)
    toast.appendChild(closeButton)
  }

  root.appendChild(toast)
  activeToastClosers.add(close)
  onNextFrame(() => {
    toast.classList.add('is-visible')
  })

  if (duration > 0) {
    timer = window.setTimeout(close, duration)
  }

  return { close }
}

export const closeAllToasts = () => {
  Array.from(activeToastClosers).forEach((close) => close())
}
