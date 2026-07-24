import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let configStoreMock: any
const mockConfig = vi.hoisted(() => ({
  icpNumber: ''
}))

vi.mock('@/store/config', () => ({
  useConfigStore: () => configStoreMock
}))

vi.mock('@/config', () => ({
  get ICP_NUMBER() {
    return mockConfig.icpNumber
  }
}))

const Footer = (await import('@/components/index/Footer.vue')).default

describe('Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfig.icpNumber = ''
    configStoreMock = reactive({
      siteConfig: reactive({
        footerHtml: ''
      }),
      displaySiteName: 'StarNav'
    })
  })

  it('renders the default copyright footer and optional ICP block', () => {
    mockConfig.icpNumber = '沪ICP备12345678号'

    const wrapper = mount(Footer)

    expect(wrapper.text()).toContain(String(new Date().getFullYear()))
    expect(wrapper.text()).toContain('StarNav')
    expect(wrapper.text()).toContain('沪ICP备12345678号')
    expect(wrapper.text()).toContain('Powered by')
    expect(wrapper.find('.custom-footer').exists()).toBe(false)
  })

  it('renders custom footer html when configured', () => {
    configStoreMock.siteConfig.footerHtml =
      '<strong>Custom Footer</strong><script>alert(1)</script><a href="javascript:alert(1)">bad</a>'

    const wrapper = mount(Footer)

    expect(wrapper.find('.custom-footer').html()).toContain('<strong>Custom Footer</strong>')
    expect(wrapper.find('.custom-footer').html()).not.toContain('<script')
    expect(wrapper.find('.custom-footer').text()).toContain('bad')
    expect(wrapper.find('.copyright').exists()).toBe(false)
  })
})
