import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('feedback', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('forwards message helpers to feedback-core', async () => {
    const core = await import('@/utils/feedback-core')
    const feedback = await import('@/utils/feedback')

    const successHandle = { close: vi.fn() }
    const successSpy = vi.spyOn(core.ElMessage, 'success').mockReturnValue(successHandle)
    const warningSpy = vi.spyOn(core.ElMessage, 'warning').mockReturnValue({ close: vi.fn() })
    const infoSpy = vi.spyOn(core.ElMessage, 'info').mockReturnValue({ close: vi.fn() })
    const errorSpy = vi.spyOn(core.ElMessage, 'error').mockReturnValue({ close: vi.fn() })
    const closeAllSpy = vi.spyOn(core.ElMessage, 'closeAll').mockImplementation(() => {})

    await expect(feedback.ElMessage.success('ok')).resolves.toBe(successHandle)
    await feedback.ElMessage.warning({ message: 'warn' })
    await feedback.ElMessage.info(true)
    await feedback.ElMessage.error(404)

    feedback.ElMessage.closeAll()
    await Promise.resolve()

    expect(successSpy).toHaveBeenCalledWith('ok')
    expect(warningSpy).toHaveBeenCalledWith({ message: 'warn' })
    expect(infoSpy).toHaveBeenCalledWith(true)
    expect(errorSpy).toHaveBeenCalledWith(404)
    expect(closeAllSpy).toHaveBeenCalledTimes(1)
  })

  it('forwards dialog helpers to feedback-core', async () => {
    const core = await import('@/utils/feedback-core')
    const feedback = await import('@/utils/feedback')

    const confirmSpy = vi.spyOn(core.ElMessageBox, 'confirm').mockResolvedValue('confirm')
    const alertSpy = vi.spyOn(core.ElMessageBox, 'alert').mockResolvedValue('close')
    const promptSpy = vi
      .spyOn(core.ElMessageBox, 'prompt')
      .mockResolvedValue({ value: 'Bob', action: 'confirm' })
    const closeSpy = vi.spyOn(core.ElMessageBox, 'close').mockImplementation(() => {})

    await expect(feedback.ElMessageBox.confirm('继续?', '确认', { type: 'warning' })).resolves.toBe(
      'confirm'
    )
    await expect(feedback.ElMessageBox.alert('已完成', '提示')).resolves.toBe('close')
    await expect(feedback.ElMessageBox.prompt('输入名称', '编辑')).resolves.toEqual({
      value: 'Bob',
      action: 'confirm'
    })

    feedback.ElMessageBox.close()
    await Promise.resolve()

    expect(confirmSpy).toHaveBeenCalledWith('继续?', '确认', { type: 'warning' })
    expect(alertSpy).toHaveBeenCalledWith('已完成', '提示')
    expect(promptSpy).toHaveBeenCalledWith('输入名称', '编辑')
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })
})
