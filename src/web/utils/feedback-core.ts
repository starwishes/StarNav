/**
 * Internal toast/dialog adapters. Prefer `@/utils/feedback` from application code.
 */
import { closeActiveDialog, openDialog } from './feedback/dialog'
import { closeAllToasts, createToast } from './feedback/toast'

const ElMessage = {
  success(input: unknown) {
    return createToast('success', input)
  },
  warning(input: unknown) {
    return createToast('warning', input)
  },
  info(input: unknown) {
    return createToast('info', input)
  },
  error(input: unknown) {
    return createToast('error', input)
  },
  closeAll() {
    closeAllToasts()
  }
}

const ElMessageBox = {
  confirm(message: unknown, title?: unknown, options?: unknown) {
    return openDialog('confirm', message, title, options)
  },
  alert(message: unknown, title?: unknown, options?: unknown) {
    return openDialog('alert', message, title, options)
  },
  prompt(message: unknown, title?: unknown, options?: unknown) {
    return openDialog('prompt', message, title, options)
  },
  close() {
    closeActiveDialog()
  }
}

export { ElMessage, ElMessageBox }
