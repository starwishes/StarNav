import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUploadedFiles: vi.fn(),
  deleteUpload: vi.fn(),
  uploadBackgroundAsset: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  confirm: vi.fn()
}))

vi.mock('@/api/admin', () => ({
  adminApi: {
    getUploadedFiles: mocks.getUploadedFiles,
    deleteUpload: mocks.deleteUpload,
    uploadBackgroundAsset: mocks.uploadBackgroundAsset
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

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

const { useSystemAssetManagement } = await import('@/composables/admin/useSystemAssetManagement')

const flushAsync = async () => {
  await Promise.resolve()
  await nextTick()
}

const mountHarness = (initialSettings: Record<string, string> = {}) => {
  const Harness = defineComponent({
    setup() {
      const settings = reactive({
        backgroundUrl: '',
        faviconUrl: '',
        logoUrl: '',
        ...initialSettings
      })
      const uploadInputRef = ref<HTMLInputElement | null>(null)

      return {
        settings,
        uploadInputRef,
        ...useSystemAssetManagement(settings, uploadInputRef)
      }
    },
    render() {
      return h('input', { ref: 'uploadInputRef', type: 'file' })
    }
  })

  return mount(Harness)
}

describe('useSystemAssetManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUploadedFiles.mockResolvedValue([])
  })

  it('fetches uploaded files on mount and exposes previewUrl', async () => {
    mocks.getUploadedFiles.mockResolvedValue([
      { filename: 'bg.jpg', url: '/uploads/bg.jpg', size: 10, uploadedAt: '2026-04-13' }
    ])

    const wrapper = mountHarness({ backgroundUrl: '/uploads/bg.jpg' })
    await flushAsync()

    expect(mocks.getUploadedFiles).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.uploadedFiles).toEqual([
      { filename: 'bg.jpg', url: '/uploads/bg.jpg', size: 10, uploadedAt: '2026-04-13' }
    ])
    expect(wrapper.vm.previewUrl).toBe('/uploads/bg.jpg')
  })

  it('triggers the hidden file input and applies uploaded file urls', async () => {
    const wrapper = mountHarness()
    await flushAsync()

    expect(wrapper.vm.uploadInputRef).not.toBeNull()
    const clickSpy = vi.spyOn(wrapper.vm.uploadInputRef as HTMLInputElement, 'click')
    wrapper.vm.triggerUpload()
    wrapper.vm.applyUploadedFile('faviconUrl', '/uploads/favicon.ico')

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.settings.faviconUrl).toBe('/uploads/favicon.ico')
  })

  it('deletes uploaded files and refreshes the list after confirmation', async () => {
    mocks.confirm.mockResolvedValue('confirm')
    mocks.deleteUpload.mockResolvedValue({ success: true })

    const wrapper = mountHarness()
    await flushAsync()
    mocks.getUploadedFiles.mockClear()

    await wrapper.vm.deleteFile('bg.jpg')

    expect(mocks.confirm).toHaveBeenCalledWith('settings.deleteConfirm', 'common.confirm', {
      type: 'warning'
    })
    expect(mocks.deleteUpload).toHaveBeenCalledWith('bg.jpg')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('admin.deleteSuccess')
    expect(mocks.getUploadedFiles).toHaveBeenCalledTimes(1)
  })

  it('ignores delete cancellation without surfacing an error', async () => {
    mocks.confirm.mockRejectedValue('cancel')

    const wrapper = mountHarness()
    await flushAsync()

    await wrapper.vm.deleteFile('bg.jpg')

    expect(mocks.deleteUpload).not.toHaveBeenCalled()
    expect(mocks.messageError).not.toHaveBeenCalled()
  })

  it('uploads background files, refreshes the list, and resets the input', async () => {
    const fileReaderResult = 'data:image/png;base64,abc'

    class MockFileReader {
      result: string | ArrayBuffer | null = fileReaderResult
      error: Error | null = null
      onload: null | (() => void) = null
      onerror: null | (() => void) = null

      readAsDataURL() {
        this.onload?.()
      }
    }

    vi.stubGlobal('FileReader', MockFileReader)
    mocks.uploadBackgroundAsset.mockResolvedValue({ success: true, url: '/uploads/bg.png' })

    const wrapper = mountHarness()
    await flushAsync()
    mocks.getUploadedFiles.mockClear()

    const input = {
      value: 'C:/fakepath/bg.png'
    } as HTMLInputElement
    Object.defineProperty(input, 'files', {
      value: [new File(['content'], 'bg.png', { type: 'image/png' })],
      configurable: true
    })

    await wrapper.vm.handleFileChange({ target: input } as unknown as Event)

    expect(mocks.uploadBackgroundAsset).toHaveBeenCalledWith(fileReaderResult, 'bg.png')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('admin.addSuccess')
    expect(mocks.getUploadedFiles).toHaveBeenCalledTimes(1)
    expect(input.value).toBe('')
  })
})
