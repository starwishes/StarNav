import { beforeEach, describe, expect, it, vi } from 'vitest'
import { systemController } from '../../../src/server/controllers/systemController.js'
import { systemAssetService } from '../../../src/server/services/system/systemAssetService.js'
import { systemHealthService } from '../../../src/server/services/system/systemHealthService.js'
import { systemSettingsService } from '../../../src/server/services/system/systemSettingsService.js'

vi.mock('../../../src/server/services/system/systemHealthService.js', () => ({
  systemHealthService: {
    getHealth: vi.fn()
  }
}))

vi.mock('../../../src/server/services/system/systemSettingsService.js', () => ({
  systemSettingsService: {
    getPublicSettings: vi.fn(),
    getAdminSettings: vi.fn(),
    updateAdminSettings: vi.fn(),
    setBackground: vi.fn()
  }
}))

vi.mock('../../../src/server/services/system/systemAssetService.js', () => ({
  systemAssetService: {
    uploadBackground: vi.fn(),
    uploadIcon: vi.fn(),
    getUploads: vi.fn(),
    deleteUpload: vi.fn()
  }
}))

describe('SystemController Unit Tests', () => {
  let req
  let res

  beforeEach(() => {
    req = {
      body: {},
      params: {}
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }

    vi.clearAllMocks()
  })

  it('should delegate getHealth to systemHealthService and preserve status code', async () => {
    systemHealthService.getHealth.mockResolvedValue({
      statusCode: 503,
      body: {
        success: true,
        message: 'Success',
        data: { status: 'unhealthy' }
      }
    })

    await systemController.getHealth(req, res)

    expect(systemHealthService.getHealth).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: { status: 'unhealthy' }
    })
  })

  it('should delegate uploadBackground payload to systemAssetService', async () => {
    req.body = { data: 'data:image/png;base64,abc' }
    systemAssetService.uploadBackground.mockReturnValue({
      success: true,
      url: '/uploads/bg_1.png'
    })

    await systemController.uploadBackground(req, res)

    expect(systemAssetService.uploadBackground).toHaveBeenCalledWith('data:image/png;base64,abc')
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      url: '/uploads/bg_1.png'
    })
  })

  it('should delegate deleteUpload params to systemAssetService', async () => {
    req.params = { filename: 'icon_1.png' }
    systemAssetService.deleteUpload.mockReturnValue({ success: true })

    await systemController.deleteUpload(req, res)

    expect(systemAssetService.deleteUpload).toHaveBeenCalledWith('icon_1.png')
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('should delegate background url updates to systemSettingsService', async () => {
    req.body = { url: '/uploads/bg_2.png' }
    systemSettingsService.setBackground.mockReturnValue({ success: true })

    await systemController.setBackground(req, res)

    expect(systemSettingsService.setBackground).toHaveBeenCalledWith('/uploads/bg_2.png')
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })
})
