import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuditLogs: vi.fn(),
  clearAuditLogs: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  confirm: vi.fn()
}))

vi.mock('@/api/admin', () => ({
  adminApi: {
    getAuditLogs: mocks.getAuditLogs,
    clearAuditLogs: mocks.clearAuditLogs
  }
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    error: mocks.messageError
  },
  ElMessageBox: {
    confirm: mocks.confirm
  }
}))

vi.mock('@/composables/useDateTimeFormatter', () => ({
  useDateTimeFormatter: () => ({
    formatDateTime: (value: string) => `formatted:${value}`
  })
}))

vi.mock('@/utils/userAgent', () => ({
  describeUserAgent: (ua: string) => `device:${ua}`
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

const AuditLog = (await import('@/components/admin/AuditLog.vue')).default

describe('AuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads audit logs on mount and renders labels, status, and pagination', async () => {
    mocks.getAuditLogs.mockResolvedValue({
      logs: [
        {
          id: 1,
          action: 'login',
          username: 'alice',
          ip: '127.0.0.1',
          userAgent: 'UA-1',
          success: true,
          timestamp: '2026-04-13T10:00:00.000Z'
        }
      ],
      total: 120
    })

    const wrapper = mount(AuditLog)
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(mocks.getAuditLogs).toHaveBeenCalledWith(1, 50)
    expect(wrapper.text()).toContain('formatted:2026-04-13T10:00:00.000Z')
    expect(wrapper.text()).toContain('translated:audit.actionLogin')
    expect(wrapper.text()).toContain('translated:common.success')
    expect(wrapper.text()).toContain('device:UA-1')
    expect(wrapper.text()).toContain('translated:common.total 120')
    expect(wrapper.text()).toContain('1 / 3')
  })

  it('changes page and reloads logs', async () => {
    mocks.getAuditLogs
      .mockResolvedValueOnce({ logs: [], total: 120 })
      .mockResolvedValueOnce({ logs: [], total: 120 })

    const wrapper = mount(AuditLog)
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    await wrapper.findAll('.sn-pagination-button')[1].trigger('click')
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(mocks.getAuditLogs).toHaveBeenNthCalledWith(1, 1, 50)
    expect(mocks.getAuditLogs).toHaveBeenNthCalledWith(2, 2, 50)
    expect(wrapper.text()).toContain('2 / 3')
  })

  it('clears logs after confirmation and refreshes the list', async () => {
    mocks.getAuditLogs
      .mockResolvedValueOnce({ logs: [], total: 0 })
      .mockResolvedValueOnce({ logs: [], total: 0 })
    mocks.confirm.mockResolvedValue('confirm')
    mocks.clearAuditLogs.mockResolvedValue({ success: true })

    const wrapper = mount(AuditLog)
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    await wrapper.find('.actions .table-button.danger').trigger('click')
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(mocks.confirm).toHaveBeenCalledWith(
      'translated:audit.clearConfirm',
      'translated:common.warning',
      {
        type: 'warning',
        confirmButtonText: 'translated:common.confirm',
        cancelButtonText: 'translated:common.cancel'
      }
    )
    expect(mocks.clearAuditLogs).toHaveBeenCalledTimes(1)
    expect(mocks.clearAuditLogs).toHaveBeenCalledWith(undefined)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:audit.clearSuccess')
    expect(mocks.getAuditLogs).toHaveBeenCalledTimes(2)
  })

  it('clears logs before a selected number of days with a UTC boundary', async () => {
    mocks.getAuditLogs
      .mockResolvedValueOnce({ logs: [], total: 0 })
      .mockResolvedValueOnce({ logs: [], total: 0 })
    mocks.confirm.mockResolvedValue('confirm')
    mocks.clearAuditLogs.mockResolvedValue({ success: true })

    const wrapper = mount(AuditLog)
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    await wrapper.find('.clear-select').setValue('7')
    await wrapper.find('.actions .table-button.danger').trigger('click')
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.stringContaining('audit.clearBeforeConfirm'),
      'translated:common.warning',
      expect.any(Object)
    )
    expect(mocks.clearAuditLogs).toHaveBeenCalledTimes(1)
    const before = mocks.clearAuditLogs.mock.calls[0][0]
    expect(before).toMatch(/^\d{4}-\d{2}-\d{2} 00:00:00$/)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:audit.clearSuccess')
  })

  it('shows errors for failed loading and failed clear operations', async () => {
    mocks.getAuditLogs.mockRejectedValueOnce(new Error('boom'))
    mocks.confirm.mockResolvedValue('confirm')
    mocks.clearAuditLogs.mockResolvedValue({ success: false, error: 'clear failed' })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(AuditLog)
    await Promise.resolve()
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(mocks.messageError).toHaveBeenCalledWith('translated:common.loadFailed')

    mocks.getAuditLogs.mockResolvedValueOnce({ logs: [], total: 0 })
    await wrapper.find('.actions .table-button.danger').trigger('click')
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(mocks.messageError).toHaveBeenCalledWith('clear failed')
  })
})
