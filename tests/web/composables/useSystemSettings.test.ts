import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAdminSettings: vi.fn(),
  updateAdminSettings: vi.fn(),
  updateConfig: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn()
}))

vi.mock('@/store/admin', () => ({
  useAdminStore: () => ({
    getAdminSettings: mocks.getAdminSettings,
    updateAdminSettings: mocks.updateAdminSettings
  })
}))

vi.mock('@/store/config', () => ({
  useConfigStore: () => ({
    updateConfig: mocks.updateConfig
  })
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    error: mocks.messageError
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

const { useSystemSettings } = await import('@/composables/admin/useSystemSettings')

describe('useSystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and stores the latest system settings', async () => {
    mocks.getAdminSettings.mockResolvedValue({
      siteName: 'StarNav',
      timezone: 'Asia/Shanghai'
    })

    const { systemSettings, fetchSettings } = useSystemSettings()
    await fetchSettings()

    expect(mocks.getAdminSettings).toHaveBeenCalledTimes(1)
    expect(systemSettings.value).toEqual({
      siteName: 'StarNav',
      timezone: 'Asia/Shanghai'
    })
  })

  it('shows a success message and syncs global config after a successful save', async () => {
    mocks.updateAdminSettings.mockResolvedValue({ success: true })

    const { handleSaveSettings } = useSystemSettings()
    const nextSettings = {
      siteName: 'Updated StarNav',
      backgroundUrl: '/uploads/bg.png'
    }

    await handleSaveSettings(nextSettings)

    expect(mocks.updateAdminSettings).toHaveBeenCalledWith(nextSettings)
    expect(mocks.messageSuccess).toHaveBeenCalledWith(
      'translated:settings.saveSettings translated:common.success'
    )
    expect(mocks.updateConfig).toHaveBeenCalledWith(nextSettings)
  })

  it('does not sync config when the save request fails', async () => {
    mocks.updateAdminSettings.mockResolvedValue({ success: false, error: 'boom' })

    const { handleSaveSettings } = useSystemSettings()
    await handleSaveSettings({ siteName: 'No-op' })

    expect(mocks.messageSuccess).not.toHaveBeenCalled()
    expect(mocks.messageError).toHaveBeenCalledWith('boom')
    expect(mocks.updateConfig).not.toHaveBeenCalled()
  })
})
