import { ElMessage as coreElMessage, ElMessageBox as coreElMessageBox } from './feedback-core'

type FeedbackMessage = typeof coreElMessage
type FeedbackMessageBox = typeof coreElMessageBox
type MessageType = keyof Pick<FeedbackMessage, 'success' | 'warning' | 'info' | 'error'>
type MessageInput = Parameters<FeedbackMessage['success']>[0]
type DialogKind = keyof Pick<FeedbackMessageBox, 'confirm' | 'alert' | 'prompt'>
type ConfirmArgs = Parameters<FeedbackMessageBox['confirm']>
type AlertArgs = Parameters<FeedbackMessageBox['alert']>
type PromptArgs = Parameters<FeedbackMessageBox['prompt']>

const callMessage = (type: MessageType, options: MessageInput) => {
  return Promise.resolve(coreElMessage[type](options))
}

const callMessageBox = (type: DialogKind, args: ConfirmArgs | AlertArgs | PromptArgs) => {
  if (type === 'confirm') {
    return Promise.resolve(coreElMessageBox.confirm(...(args as ConfirmArgs)))
  }

  if (type === 'alert') {
    return Promise.resolve(coreElMessageBox.alert(...(args as AlertArgs)))
  }

  return Promise.resolve(coreElMessageBox.prompt(...(args as PromptArgs)))
}

const feedbackMessage = {
  success(options: MessageInput) {
    return callMessage('success', options)
  },
  warning(options: MessageInput) {
    return callMessage('warning', options)
  },
  info(options: MessageInput) {
    return callMessage('info', options)
  },
  error(options: MessageInput) {
    return callMessage('error', options)
  },
  closeAll() {
    coreElMessage.closeAll()
  }
}

const feedbackMessageBox = {
  confirm(...args: ConfirmArgs) {
    return callMessageBox('confirm', args)
  },
  alert(...args: AlertArgs) {
    return callMessageBox('alert', args)
  },
  prompt(...args: PromptArgs) {
    return callMessageBox('prompt', args)
  },
  close() {
    coreElMessageBox.close()
  }
}

export { feedbackMessage as ElMessage, feedbackMessageBox as ElMessageBox }
