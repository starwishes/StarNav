// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { systemController } from '../../../src/server/controllers/systemController.js'

const { systemHealthServiceMock, systemSettingsServiceMock, systemAssetServiceMock } = vi.hoisted(
  () => ({
    systemHealthServiceMock: {
      getHealth: vi.fn()
    },
    systemSettingsServiceMock: {
      getPublicSettings: vi.fn(),
      getAdminSettings: vi.fn(),
      updateAdminSettings: vi.fn(),
      setBackground: vi.fn()
    },
    systemAssetServiceMock: {
      uploadBackground: vi.fn(),
      uploadIcon: vi.fn(),
      getUploads: vi.fn(),
      deleteUpload: vi.fn()
    }
  })
)

vi.mock('../../../src/server/services/system/systemHealthService.js', () => ({
  systemHealthService: systemHealthServiceMock
}))
vi.mock('../../../src/server/services/system/systemSettingsService.js', () => ({
  systemSettingsService: systemSettingsServiceMock
}))
vi.mock('../../../src/server/services/system/systemAssetService.js', () => ({
  systemAssetService: systemAssetServiceMock
}))

const makeRequest = (overrides = {}) => ({ query: {}, body: {}, params: {}, ...overrides })

const makeResponse = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() }
  return res
}

describe('systemController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates health and settings reads', async () => {
    systemHealthServiceMock.getHealth.mockResolvedValue({ status: 'healthy' })
    systemSettingsServiceMock.getPublicSettings.mockResolvedValue({})
    systemSettingsServiceMock.getAdminSettings.mockResolvedValue({})

    await systemController.getHealth(makeRequest(), makeResponse())
    await systemController.getPublicSettings(makeRequest(), makeResponse())
    await systemController.getAdminSettings(makeRequest(), makeResponse())

    expect(systemHealthServiceMock.getHealth).toHaveBeenCalled()
    expect(systemSettingsServiceMock.getPublicSettings).toHaveBeenCalled()
    expect(systemSettingsServiceMock.getAdminSettings).toHaveBeenCalled()
  })

  it('delegates settings updates and background url', async () => {
    systemSettingsServiceMock.updateAdminSettings.mockResolvedValue({ success: true })
    systemSettingsServiceMock.setBackground.mockResolvedValue({ success: true })

    await systemController.updateAdminSettings(
      makeRequest({ body: { siteName: 'Nav' } }),
      makeResponse()
    )
    await systemController.setBackground(
      makeRequest({ body: { url: 'https://x/bg.png' } }),
      makeResponse()
    )

    expect(systemSettingsServiceMock.updateAdminSettings).toHaveBeenCalledWith({
      siteName: 'Nav'
    })
    expect(systemSettingsServiceMock.setBackground).toHaveBeenCalledWith('https://x/bg.png')
  })

  it('delegates asset uploads and listings', async () => {
    systemAssetServiceMock.uploadBackground.mockResolvedValue({ url: '/uploads/bg.png' })
    systemAssetServiceMock.uploadIcon.mockResolvedValue({ url: '/uploads/i.png' })
    systemAssetServiceMock.getUploads.mockResolvedValue({ files: [] })

    await systemController.uploadBackground(
      makeRequest({ body: { data: 'data:image/png;base64,x' } }),
      makeResponse()
    )
    await systemController.uploadIcon(
      makeRequest({ body: { data: 'data:image/png;base64,y' } }),
      makeResponse()
    )
    await systemController.getUploads(makeRequest(), makeResponse())

    expect(systemAssetServiceMock.uploadBackground).toHaveBeenCalledWith('data:image/png;base64,x')
    expect(systemAssetServiceMock.uploadIcon).toHaveBeenCalledWith('data:image/png;base64,y')
    expect(systemAssetServiceMock.getUploads).toHaveBeenCalled()
  })

  it('normalizes filename params for deleteUpload', async () => {
    systemAssetServiceMock.deleteUpload.mockResolvedValue({ success: true })

    await systemController.deleteUpload(
      makeRequest({ params: { filename: 'a.png' } }),
      makeResponse()
    )
    expect(systemAssetServiceMock.deleteUpload).toHaveBeenCalledWith('a.png')

    await systemController.deleteUpload(
      makeRequest({ params: { filename: ['b.png'] } }),
      makeResponse()
    )
    expect(systemAssetServiceMock.deleteUpload).toHaveBeenCalledWith('b.png')
  })
})
