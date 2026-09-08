/**
 * Public feedback entry for the SPA.
 * Implementation lives in `feedback-core` + `feedback/*`; import only this module
 * from app code (`@/utils/feedback`), not feedback-core.
 */
import { ElMessage as coreElMessage, ElMessageBox as coreElMessageBox } from './feedback-core'

type FeedbackMessage = typeof coreElMessage
type FeedbackMessageBox = typeof coreElMessageBox
type MessageType = keyof Pick<FeedbackMessage, 'success' | 'warning' | 'info' | 'error'>
type MessageInput = Parameters<FeedbackMessage['success']>[0]
// prompt（输入弹层）全库零调用，第 34 轮 Info 决策删除，保留 API 面仅 confirm/alert
type DialogKind = keyof Pick<FeedbackMessageBox, 'confirm' | 'alert'>
type ConfirmArgs = Parameters<FeedbackMessageBox['confirm']>
type AlertArgs = Parameters<FeedbackMessageBox['alert']>

const callMessage = (type: MessageType, options: MessageInput) => {
  return Promise.resolve(coreElMessage[type](options))
}

const callMessageBox = (type: DialogKind, args: ConfirmArgs | AlertArgs) => {
  if (type === 'confirm') {
    return Promise.resolve(coreElMessageBox.confirm(...(args as ConfirmArgs)))
  }

  return Promise.resolve(coreElMessageBox.alert(...(args as AlertArgs)))
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
  close() {
    coreElMessageBox.close()
  }
}

export { feedbackMessage as ElMessage, feedbackMessageBox as ElMessageBox }
