import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  messageWarning: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn()
}))

let adminStoreMock: any
let configStoreMock: any
const mountedWrappers: Array<ReturnType<typeof mount>> = []

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

vi.mock('@/store/config', () => ({
  useConfigStore: () => configStoreMock
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    success: mocks.messageSuccess,
    error: mocks.messageError,
    warning: mocks.messageWarning
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    replace: mocks.routerReplace
  }),
  useRoute: () => ({
    path: '/',
    query: {}
  })
}))

const LoginDialog = (await import('@/components/admin/LoginDialog.vue')).default

const createWrapper = (modelValue = true) => {
  const wrapper = mount(LoginDialog, {
    props: {
      modelValue
    },
    global: {
      stubs: {
        AppIcon: true,
        teleport: true
      }
    }
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

describe('LoginDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminStoreMock = {
      login: mocks.login,
      register: mocks.register,
      user: { login: 'alice', name: 'alice', level: 1 }
    }
    configStoreMock = {
      siteConfig: reactive({
        registrationEnabled: false
      })
    }
    document.documentElement.className = ''
    document.documentElement.removeAttribute('theme-mode')
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    document.body.innerHTML = ''
  })

  it('hides the register tab when registration is disabled', async () => {
    const wrapper = createWrapper()
    await nextTick()

    expect(wrapper.findAll('.tab-button')).toHaveLength(1)
    expect(wrapper.text()).toContain('translated:nav.login')
    expect(wrapper.text()).not.toContain('translated:nav.register')
    expect(wrapper.text()).not.toContain('translated:auth.loginNotice')
  })

  it('closes from the close button, backdrop, and escape key', async () => {
    const wrapper = createWrapper()

    await wrapper.find('.dialog-close').trigger('click')
    await wrapper.find('.login-dialog-backdrop').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [false], [false]])
  })

  it('validates empty login forms and closes after a successful login', async () => {
    mocks.login.mockResolvedValue({ success: true })

    const wrapper = createWrapper()
    await wrapper.find('form').trigger('submit')

    expect(mocks.messageWarning).toHaveBeenCalledWith('translated:auth.loginFailed')
    expect(mocks.login).not.toHaveBeenCalled()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('alice')
    await inputs[1].setValue('secret')
    await wrapper.find('form').trigger('submit')

    expect(mocks.login).toHaveBeenCalledWith('alice', 'secret')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:auth.loginSuccess')
    expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
    expect(mocks.routerPush).not.toHaveBeenCalled()
  })

  it('supports registration when enabled and resets to login after success', async () => {
    configStoreMock.siteConfig.registrationEnabled = true
    mocks.register.mockResolvedValue({ success: true })

    const wrapper = createWrapper()
    const tabButtons = wrapper.findAll('.tab-button')

    await tabButtons[1].trigger('click')
    expect(tabButtons[1].classes()).toContain('active')

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('new-user')
    await inputs[1].setValue('new-password')
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(mocks.register).toHaveBeenCalledWith('new-user', 'new-password')
    expect(mocks.messageSuccess).toHaveBeenCalledWith('translated:auth.registerSuccess')
    expect(wrapper.findAll('.tab-button')[0].classes()).toContain('active')
  })

  it('forces register mode back to login when registration becomes unavailable', async () => {
    configStoreMock.siteConfig.registrationEnabled = true

    const wrapper = createWrapper()
    await wrapper.findAll('.tab-button')[1].trigger('click')
    expect(wrapper.findAll('.tab-button')[1].classes()).toContain('active')

    configStoreMock.siteConfig.registrationEnabled = false
    await nextTick()

    expect(wrapper.findAll('.tab-button')).toHaveLength(1)
    expect(wrapper.find('.dialog-header h2').text()).toBe('translated:nav.login')
  })

  it('surfaces login and register failures through the feedback layer', async () => {
    configStoreMock.siteConfig.registrationEnabled = true
    mocks.login.mockResolvedValue({ success: false, error: 'bad creds' })
    mocks.register.mockResolvedValue({ success: false, error: 'register failed' })

    const wrapper = createWrapper()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('alice')
    await inputs[1].setValue('wrong')
    await wrapper.find('form').trigger('submit')

    expect(mocks.messageError).toHaveBeenCalledWith('bad creds')

    await wrapper.findAll('.tab-button')[1].trigger('click')
    await wrapper.find('form').trigger('submit')

    expect(mocks.messageError).toHaveBeenCalledWith('register failed')
  })

  it('applies dark-mode surfaces when the homepage is in dark theme', async () => {
    document.documentElement.setAttribute('theme-mode', 'dark')

    const wrapper = createWrapper()
    await nextTick()

    const shellStyles = getComputedStyle(wrapper.find('.login-dialog-shell').element)
    const inputStyles = getComputedStyle(wrapper.find('.dialog-input').element)
    const closeStyles = getComputedStyle(wrapper.find('.dialog-close').element)

    expect(shellStyles.backgroundColor).not.toBe('rgba(255, 255, 255, 0.96)')
    expect(inputStyles.backgroundColor).not.toBe('rgba(255, 255, 255, 0.92)')
    expect(closeStyles.backgroundColor).not.toBe('rgba(148, 163, 184, 0.14)')
  })
})
