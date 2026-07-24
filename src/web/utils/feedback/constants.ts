import type { MessageType } from './types'

export const FEEDBACK_STYLE_ID = 'sn-feedback-style'
export const TOAST_ROOT_ID = 'sn-feedback-toast-root'
export const DIALOG_ROOT_ID = 'sn-feedback-dialog-root'

export const TOAST_ICONS: Record<MessageType, string> = {
  success: '✓',
  warning: '!',
  info: 'i',
  error: '×'
}

export const DIALOG_ICONS: Record<MessageType, string> = {
  success: '✓',
  warning: '!',
  info: 'i',
  error: '×'
}
