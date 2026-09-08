import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loadFeedbackCore = async () => {
  vi.resetModules()
  return import('@/utils/feedback-core')
}

describe('feedback-core', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.getElementById('sn-feedback-style')?.remove()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it(
    'renders toast messages, normalizes content, and supports manual closing',
    { timeout: 15_000 },
    async () => {
      const { ElMessage } = await loadFeedbackCore()

      ElMessage.success({
        message: { message: 123 },
        duration: 0,
        showClose: true
      })
      ElMessage.error('boom')

      const toasts = Array.from(document.querySelectorAll('.sn-feedback-toast'))

      expect(document.getElementById('sn-feedback-style')).not.toBeNull()
      expect(document.getElementById('sn-feedback-toast-root')).not.toBeNull()
      expect(toasts).toHaveLength(2)
      expect(toasts[0].classList.contains('is-visible')).toBe(true)
      expect(toasts[0].querySelector('.sn-feedback-toast-content')?.textContent).toBe('123')
      expect(toasts[1].querySelector('.sn-feedback-toast-icon')?.textContent).toBe('×')
      ;(toasts[0].querySelector('.sn-feedback-toast-close') as HTMLButtonElement).click()
      await vi.advanceTimersByTimeAsync(180)

      expect(document.querySelectorAll('.sn-feedback-toast')).toHaveLength(1)
    }
  )

  it('auto closes toast messages and closes all active toasts', async () => {
    const { ElMessage } = await loadFeedbackCore()

    ElMessage.info({ message: 'soon', duration: 50 })
    ElMessage.warning({ message: 'persist', duration: 0 })

    expect(document.querySelectorAll('.sn-feedback-toast')).toHaveLength(2)

    await vi.advanceTimersByTimeAsync(49)
    expect(document.querySelectorAll('.sn-feedback-toast')).toHaveLength(2)

    await vi.advanceTimersByTimeAsync(181)
    expect(document.querySelectorAll('.sn-feedback-toast')).toHaveLength(1)

    ElMessage.closeAll()
    await vi.advanceTimersByTimeAsync(180)

    expect(document.querySelectorAll('.sn-feedback-toast')).toHaveLength(0)
  })

  it('renders confirm dialogs and rejects dismissal paths', async () => {
    const { ElMessageBox } = await loadFeedbackCore()

    const promise = ElMessageBox.confirm({ message: '继续?' }, '二次确认', {
      type: 'warning',
      showClose: true,
      closeOnClickModal: false,
      confirmButtonText: '继续',
      cancelButtonText: '返回'
    })

    const overlay = document.querySelector('.sn-feedback-dialog-backdrop') as HTMLElement
    const dialog = document.querySelector('.sn-feedback-dialog') as HTMLElement

    expect(document.getElementById('sn-feedback-dialog-root')).not.toBeNull()
    expect(dialog.className).toContain('is-warning')
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(document.querySelector('.sn-feedback-dialog-title')?.textContent).toBe('二次确认')
    expect(document.querySelector('.sn-feedback-dialog-message')?.textContent).toBe('继续?')

    // 自绘弹层须有可访问名/描述：title/message 元素携带稳定 id，
    // dialog 通过 aria-labelledby/describedby 引用（第 34 轮 L2）。
    const title = document.querySelector('.sn-feedback-dialog-title') as HTMLElement
    const message = document.querySelector('.sn-feedback-dialog-message') as HTMLElement
    expect(title.id).toMatch(/^sn-feedback-dialog-title-\d+$/)
    expect(message.id).toMatch(/^sn-feedback-dialog-message-\d+$/)
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id)
    expect(dialog.getAttribute('aria-describedby')).toBe(message.id)
    expect(document.getElementById(title.id)).not.toBeNull()
    expect(document.getElementById(message.id)).not.toBeNull()

    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
    expect(document.querySelector('.sn-feedback-dialog-backdrop')).not.toBeNull()
    ;(document.querySelector('.sn-feedback-dialog-close') as HTMLButtonElement).click()
    await expect(promise).rejects.toBe('cancel')
    await vi.advanceTimersByTimeAsync(180)

    expect(document.querySelector('.sn-feedback-dialog-backdrop')).toBeNull()
  })

  it('handles alert and close helper flows', async () => {
    const { ElMessageBox } = await loadFeedbackCore()

    const alertPromise = ElMessageBox.alert(true)

    expect(document.querySelector('.sn-feedback-dialog-title')?.textContent).toBe('提示')
    expect(document.querySelector('.sn-feedback-dialog-message')?.textContent).toBe('true')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect(alertPromise).resolves.toBe('close')
    await vi.advanceTimersByTimeAsync(180)

    const closePromise = ElMessageBox.confirm('关闭测试')
    ElMessageBox.close()

    await expect(closePromise).rejects.toBe('cancel')
    await vi.advanceTimersByTimeAsync(180)
  })
})
