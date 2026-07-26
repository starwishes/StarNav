import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAppSelectValue } from '../helpers/appSelect'

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
    t: (key: string) => `translated:${key}`
  })
}))

const UploadedFilesPanelStub = defineComponent({
  name: 'UploadedFilesPanel',
  props: {
    files: {
      type: Array,
      default: () => []
    },
    loading: Boolean
  },
  emits: ['delete', 'apply'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'uploaded-files-panel-stub' }, [
        h('span', { class: 'stub-file-count' }, String(props.files.length)),
        h(
          'button',
          {
            class: 'stub-apply-logo',
            onClick: () => emit('apply', 'logoUrl', '/uploads/logo.png')
          },
          'apply'
        ),
        h(
          'button',
          { class: 'stub-delete-file', onClick: () => emit('delete', 'bg.jpg') },
          'delete'
        )
      ])
  }
})

const SystemSettings = (await import('@/components/admin/SystemSettings.vue')).default

const flushAsync = async () => {
  await Promise.resolve()
  await nextTick()
}

const createWrapper = (initialSettings: Record<string, unknown> = {}) =>
  mount(SystemSettings, {
    props: {
      initialSettings
    },
    global: {
      stubs: {
        UploadedFilesPanel: UploadedFilesPanelStub
      }
    }
  })

describe('SystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUploadedFiles.mockResolvedValue([
      {
        filename: 'bg.jpg',
        url: '/uploads/bg.jpg',
        size: 12,
        uploadedAt: '2026-04-13T10:00:00.000Z'
      }
    ])
  })

  it('hydrates from initial settings and syncs when props change', async () => {
    const wrapper = createWrapper({
      siteName: 'StarNav',
      timezone: 'Asia/Shanghai',
      homeUrl: 'https://start.test',
      logoUrl: '/uploads/logo-old.png',
      faviconUrl: '/uploads/favicon.ico',
      backgroundUrl: '/uploads/bg.jpg'
    })
    await flushAsync()

    expect(
      (wrapper.find('[data-setting-field="siteName"] .settings-input').element as HTMLInputElement)
        .value
    ).toBe('StarNav')
    expect(getAppSelectValue(wrapper, '[data-setting-field="timezone"] .settings-select')).toBe(
      'Asia/Shanghai'
    )
    expect(
      (wrapper.find('[data-setting-field="homeUrl"] .settings-input').element as HTMLInputElement)
        .value
    ).toBe('https://start.test')
    // Theme preset/color settings removed; day/night toggle lives in the header.
    expect(wrapper.find('[data-setting-field="themePreset"]').exists()).toBe(false)
    expect(wrapper.find('[data-setting-field="themeColor"]').exists()).toBe(false)
    expect(wrapper.find('[data-current-asset="logoUrl"] .logo-preview').attributes('src')).toBe(
      '/uploads/logo-old.png'
    )
    expect(
      wrapper.find('[data-current-asset="faviconUrl"] .favicon-preview').attributes('src')
    ).toBe('/uploads/favicon.ico')
    expect(
      wrapper.find('[data-current-asset="backgroundUrl"] .bg-preview').attributes('style')
    ).toContain('/uploads/bg.jpg')
    expect(wrapper.find('.stub-file-count').text()).toBe('1')

    await wrapper.setProps({
      initialSettings: {
        siteName: 'Renamed',
        timezone: 'Europe/London',
        homeUrl: 'https://renamed.test',
        backgroundUrl: '/uploads/next.jpg'
      }
    })
    await flushAsync()

    expect(
      (wrapper.find('[data-setting-field="siteName"] .settings-input').element as HTMLInputElement)
        .value
    ).toBe('Renamed')
    expect(getAppSelectValue(wrapper, '[data-setting-field="timezone"] .settings-select')).toBe(
      'Europe/London'
    )
    expect(
      (wrapper.find('[data-setting-field="homeUrl"] .settings-input').element as HTMLInputElement)
        .value
    ).toBe('https://renamed.test')
    expect(
      wrapper.find('[data-current-asset="backgroundUrl"] .bg-preview').attributes('style')
    ).toContain('/uploads/next.jpg')
  })

  it('fills the default footer, integrates uploaded-file actions, and emits the save payload', async () => {
    mocks.confirm.mockResolvedValue('confirm')
    mocks.deleteUpload.mockResolvedValue({ success: true })

    const wrapper = createWrapper({
      siteName: 'StarNav',
      footerHtml: ''
    })
    await flushAsync()

    await wrapper.find('.fill-footer-btn').trigger('click')
    expect(
      (
        wrapper.find('[data-setting-field="footerHtml"] .settings-textarea')
          .element as HTMLTextAreaElement
      ).value
    ).toContain('StarNav')

    await wrapper.find('.stub-apply-logo').trigger('click')
    await wrapper.find('.stub-delete-file').trigger('click')
    await flushAsync()

    expect(mocks.confirm).toHaveBeenCalledWith(
      'translated:settings.deleteConfirm',
      'translated:common.confirm',
      {
        type: 'warning'
      }
    )
    expect(mocks.deleteUpload).toHaveBeenCalledWith('bg.jpg')
    expect(mocks.getUploadedFiles).toHaveBeenCalledTimes(2)

    await wrapper.find('form').trigger('submit')

    const savePayload = wrapper.emitted('save')?.[0]?.[0] as Record<string, unknown>
    expect(savePayload).toMatchObject({
      siteName: 'StarNav',
      logoUrl: '/uploads/logo.png'
    })
    expect(savePayload).not.toHaveProperty('themePreset')
    expect(savePayload).not.toHaveProperty('themeColor')
  })

  it('triggers upload and refresh actions through the embedded asset management flow', async () => {
    const wrapper = createWrapper({
      backgroundUrl: '/uploads/bg.jpg'
    })
    await flushAsync()

    const uploadInput = wrapper.find('input[type="file"]')
    const clickSpy = vi.spyOn(uploadInput.element as HTMLInputElement, 'click')
    await wrapper.find('.trigger-upload-btn').trigger('click')
    await wrapper.find('.refresh-files-btn').trigger('click')
    await flushAsync()

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(mocks.getUploadedFiles).toHaveBeenCalledTimes(2)
  })
})
