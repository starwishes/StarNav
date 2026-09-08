export type MessageType = 'success' | 'warning' | 'info' | 'error'
// prompt（输入弹层）第 34 轮 Info 决策删除，见 feedback/dialog.ts
export type DialogKind = 'confirm' | 'alert'

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
}

export interface MessageHandle {
  close: () => void
}

export interface DialogController {
  dismiss: () => void
}
