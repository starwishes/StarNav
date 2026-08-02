import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeOtherSessions: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  confirm: vi.fn()
}))

vi.mock('@/api/admin', () => ({
  adminApi: {
    getSessions: mocks.getSessions,
    revokeSession: mocks.revokeSession,
    revokeOtherSessions: mocks.revokeOtherSessions
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

const SessionManager = (await import('@/components/admin/SessionManager.vue')).default

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads sessions on mount and renders current session metadata', async () => {
    mocks.getSessions.mockResolvedValue([
      {
        sessionId: 'current',
        ip: '127.0.0.1',
        userAgent: 'UA-1',
        createdAt: '2026-04-13T10:00:00.000Z',
        lastActiveAt: '2026-04-13T10:10:00.000Z',
        isCurrent: true
      },
      {
        sessionId: 'old',
        ip: '10.0.0.2',
        userAgent: 'UA-2',
        createdAt: '2026-04-12T10:00:00.000Z',
        lastActiveAt: '2026-04-12T10:10:00.000Z',
        isCurrent: false
      }
    ])

    const wrapper = mount(SessionManager)
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(mocks.getSessions).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('translated:sessions.current')
    expect(wrapper.text()).toContain('device:UA-1')
    expect(wrapper.text()).toContain('formatted:2026-04-13T10:00:00.000Z')
    expect(wrapper.text()).toContain('translated:sessions.revokeCurrent')
  })

  it('revokes a selected session after confirmation and refreshes the list', async () => {
    mocks.getSessions
      .mockResolvedValueOnce([
        {
          sessionId: 'old',
          ip: '10.0.0.2',
          userAgent: 'UA-2',
          createdAt: '2026-04-12T10:00:00.000Z',
          lastActiveAt: '2026-04-12T10:10:00.000Z',
          isCurrent: false
        }
      ])
      .mockResolvedValueOnce([])
    mocks.confirm.mockResolvedValue('confirm')

    const wrapper = mount(SessionManager)
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    await wrapper.find('tbody .table-button.link.danger').trigger('click')
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(mocks.confirm).toHaveBeenCalledWith(
      'translated:sessions.revokeConfirm',
      'translated:common.confirm',
      { type: 'warning' }
    )
    expect(mocks.revokeSession).toHaveBeenCalledWith('old')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:common.success')
    expect(mocks.getSessions).toHaveBeenCalledTimes(2)
  })

  it('revokes other sessions and reports the revoked count', async () => {
    mocks.getSessions.mockResolvedValue([])
    mocks.confirm.mockResolvedValue('confirm')
    mocks.revokeOtherSessions.mockResolvedValue(3)

    const wrapper = mount(SessionManager)
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    await wrapper.find('.header .table-button.danger').trigger('click')
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(mocks.confirm).toHaveBeenCalledWith(
      'translated:sessions.revokeAllConfirm',
      'translated:common.confirm',
      { type: 'warning' }
    )
    expect(mocks.revokeOtherSessions).toHaveBeenCalledTimes(1)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:common.success 3')
  })

  it('shows a load error when the session list request fails', async () => {
    mocks.getSessions.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    mount(SessionManager)
    await Promise.resolve()
    await Promise.resolve()

    expect(mocks.messageError).toHaveBeenCalledWith('translated:common.loadFailed')
  })
})
