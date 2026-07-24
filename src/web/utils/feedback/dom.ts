import { FEEDBACK_STYLE_ID } from './constants'

const FEEDBACK_STYLES = `
#sn-feedback-toast-root {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 4100;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
  pointer-events: none;
}

.sn-feedback-toast {
  min-width: min(320px, calc(100vw - 32px));
  max-width: min(420px, calc(100vw - 32px));
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.94);
  color: #f8fafc;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.22);
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
  pointer-events: auto;
}

.sn-feedback-toast.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.sn-feedback-toast.is-closing {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.sn-feedback-toast.is-success {
  background: linear-gradient(135deg, rgba(22, 163, 74, 0.96), rgba(21, 128, 61, 0.92));
}

.sn-feedback-toast.is-warning {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.96), rgba(180, 83, 9, 0.92));
}

.sn-feedback-toast.is-info {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.96), rgba(29, 78, 216, 0.92));
}

.sn-feedback-toast.is-error {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.96), rgba(185, 28, 28, 0.92));
}

.sn-feedback-toast-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.sn-feedback-toast-content {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.sn-feedback-toast-close {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.82;
  flex-shrink: 0;
}

#sn-feedback-dialog-root {
  position: fixed;
  inset: 0;
  z-index: 4200;
  pointer-events: none;
}

.sn-feedback-dialog-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(16px);
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: auto;
}

.sn-feedback-dialog-backdrop.is-visible {
  opacity: 1;
}

.sn-feedback-dialog {
  width: min(100%, 460px);
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.52);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  box-shadow: 0 26px 64px rgba(15, 23, 42, 0.24);
  color: #0f172a;
  transform: translateY(10px) scale(0.98);
  transition: transform 0.18s ease;
}

.sn-feedback-dialog-backdrop.is-visible .sn-feedback-dialog {
  transform: translateY(0) scale(1);
}

.sn-feedback-dialog-body {
  padding: 24px 24px 20px;
}

.sn-feedback-dialog-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.sn-feedback-dialog-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
}

.sn-feedback-dialog.is-success .sn-feedback-dialog-icon {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.sn-feedback-dialog.is-warning .sn-feedback-dialog-icon {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.sn-feedback-dialog.is-error .sn-feedback-dialog-icon {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.sn-feedback-dialog-copy {
  flex: 1;
}

.sn-feedback-dialog-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.sn-feedback-dialog-message {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
  word-break: break-word;
  white-space: pre-wrap;
}

.sn-feedback-dialog-close {
  border: none;
  background: rgba(148, 163, 184, 0.14);
  color: rgba(15, 23, 42, 0.68);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.sn-feedback-dialog-input {
  width: 100%;
  margin-top: 18px;
  min-height: 42px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  color: #0f172a;
  background: rgba(255, 255, 255, 0.92);
}

.sn-feedback-dialog-input:focus {
  outline: none;
  border-color: rgba(37, 99, 235, 0.35);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

.sn-feedback-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 24px;
}

.sn-feedback-dialog-button {
  min-width: 96px;
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

.sn-feedback-dialog-button:hover {
  transform: translateY(-1px);
}

.sn-feedback-dialog-button.ghost {
  background: rgba(148, 163, 184, 0.12);
  color: #334155;
}

.sn-feedback-dialog-button.primary {
  background: linear-gradient(135deg, rgb(var(--ui-theme-rgb, 59 130 246)), rgba(var(--ui-theme-rgb, 59 130 246), 0.84));
  color: #fff;
  box-shadow: 0 12px 24px rgba(var(--ui-theme-rgb, 59 130 246), 0.18);
}

@media (max-width: 640px) {
  #sn-feedback-toast-root {
    top: 16px;
    right: 16px;
    left: 16px;
    align-items: stretch;
  }

  .sn-feedback-toast {
    min-width: 0;
    max-width: none;
  }

  .sn-feedback-dialog-backdrop {
    padding: 16px;
  }

  .sn-feedback-dialog-footer {
    flex-direction: column-reverse;
  }

  .sn-feedback-dialog-button {
    width: 100%;
  }
}
`

export const hasDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined'

export const onNextFrame = (callback: () => void) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback)
    return
  }
  setTimeout(callback, 16)
}

export const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value == null) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object' && 'message' in (value as Record<string, unknown>)) {
    return normalizeText((value as Record<string, unknown>).message)
  }
  return String(value)
}

export const ensureStyles = () => {
  if (!hasDOM() || document.getElementById(FEEDBACK_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = FEEDBACK_STYLE_ID
  style.textContent = FEEDBACK_STYLES
  ;(document.head || document.documentElement).appendChild(style)
}

export const ensureRoot = (id: string) => {
  if (!hasDOM()) return null

  let root = document.getElementById(id)
  if (!root) {
    root = document.createElement('div')
    root.id = id
    ;(document.body || document.documentElement).appendChild(root)
  }
  return root
}
