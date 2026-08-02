export type MessageType = 'success' | 'warning' | 'info' | 'error'
export type DialogKind = 'confirm' | 'alert' | 'prompt'

export interface MessageOptions {
  message?: unknown
  duration?: number
  showClose?: boolean
}

export interface DialogOptions {
  type?: MessageType
  confirmButtonText?: string
  cancelButtonText?: string
  showClose?: boolean
  closeOnClickModal?: boolean
  inputValue?: string
  inputPlaceholder?: string
  inputType?: string
}

export interface MessageHandle {
  close: () => void
}

export interface DialogController {
  dismiss: () => void
}
