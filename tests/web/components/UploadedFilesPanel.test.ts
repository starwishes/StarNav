import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

vi.mock('@/composables/useDateTimeFormatter', () => ({
  useDateTimeFormatter: () => ({
    formatDateTime: (value: string) => `formatted:${value}`
  })
}))

const UploadedFilesPanel = (await import('@/components/admin/settings/UploadedFilesPanel.vue'))
  .default

describe('UploadedFilesPanel', () => {
  it('renders uploaded files with formatted metadata and emits apply/delete actions', async () => {
    const wrapper = mount(UploadedFilesPanel, {
      props: {
        loading: false,
        files: [
          {
            filename: 'bg.jpg',
            url: '/uploads/bg.jpg',
            size: 1536,
            uploadedAt: '2026-04-13T10:00:00.000Z'
          }
        ]
      }
    })

    expect(wrapper.find('.file-name').text()).toBe('bg.jpg')
    expect(wrapper.find('.file-meta').text()).toContain('1.5 KB')
    expect(wrapper.find('.file-meta').text()).toContain('formatted:2026-04-13T10:00:00.000Z')
    expect(wrapper.find('.file-preview').attributes('style')).toContain('/uploads/bg.jpg')

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    await buttons[3].trigger('click')

    expect(wrapper.emitted('apply')).toEqual([
      ['backgroundUrl', '/uploads/bg.jpg'],
      ['faviconUrl', '/uploads/bg.jpg'],
      ['logoUrl', '/uploads/bg.jpg']
    ])
    expect(wrapper.emitted('delete')).toEqual([['bg.jpg']])
  })

  it('shows the empty state only when not loading', async () => {
    const wrapper = mount(UploadedFilesPanel, {
      props: {
        loading: false,
        files: []
      }
    })

    expect(wrapper.text()).toContain('translated:settings.noFiles')

    await wrapper.setProps({ loading: true })
    expect(wrapper.text()).not.toContain('translated:settings.noFiles')
    expect(wrapper.find('.uploaded-files').exists()).toBe(false)
  })
})
