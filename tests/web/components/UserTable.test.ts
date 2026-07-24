import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { selectAppOption } from '../helpers/appSelect'

const mocks = vi.hoisted(() => ({
  messageWarning: vi.fn(),
  confirm: vi.fn()
}))

type UserRow = {
  username: string
  level: number
  createdAt?: string
}

let adminStoreMock: { user: { login: string } | null }
const mountedWrappers: Array<ReturnType<typeof mount>> = []

vi.mock('@/store/admin', () => ({
  useAdminStore: () => adminStoreMock
}))

vi.mock('@/utils/feedback', () => ({
  ElMessage: {
    warning: mocks.messageWarning
  },
  ElMessageBox: {
    confirm: mocks.confirm
  }
}))

vi.mock('@/composables/useDateTimeFormatter', () => ({
  useDateTimeFormatter: () => ({
    formatDateTime: (value?: string) => (value ? `formatted:${value}` : '-')
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`
  })
}))

const UserTable = (await import('@/components/admin/UserTable.vue')).default

const createWrapper = (users: UserRow[]) => {
  const wrapper = mount(UserTable, {
    props: {
      users
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

describe('UserTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminStoreMock = {
      user: {
        login: 'alice'
      }
    }
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
  })

  it('shows the empty state when there are no users', () => {
    const wrapper = createWrapper([])

    expect(wrapper.text()).toContain('translated:common.noData')
  })

  it('renders users, disables protected actions, and emits level updates', async () => {
    const wrapper = createWrapper([
      { username: 'admin', level: 3, createdAt: '2026-04-13T10:00:00.000Z' },
      { username: 'alice', level: 1, createdAt: '2026-04-12T10:00:00.000Z' },
      { username: 'bob', level: 2, createdAt: '2026-04-11T10:00:00.000Z' }
    ])

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(wrapper.text()).toContain('formatted:2026-04-13T10:00:00.000Z')
    expect(wrapper.text()).toContain('translated:userLevel.admin')
    expect(wrapper.text()).toContain('translated:userLevel.vip')

    const selects = wrapper.findAll('.level-select')
    expect(selects[0].attributes('aria-disabled')).toBe('true')
    expect(selects[1].attributes('aria-disabled')).toBe('false')
    expect(selects[2].attributes('aria-disabled')).toBe('false')

    const buttons = wrapper.findAll('button.table-link-button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
    expect(buttons[2].attributes('disabled')).toBeUndefined()
    expect(buttons[3].attributes('disabled')).toBeDefined()
    expect(buttons[4].attributes('disabled')).toBeUndefined()
    expect(buttons[5].attributes('disabled')).toBeUndefined()

    await selectAppOption(selects[2], 3)

    expect(wrapper.emitted('update-level')).toEqual([['bob', 3]])
  })

  it('opens the add dialog, validates required fields, and emits add payloads', async () => {
    const wrapper = createWrapper([{ username: 'alice', level: 1 }])

    await wrapper.find('.toolbar-button').trigger('click')
    expect(wrapper.text()).toContain('translated:users.addUser')

    await wrapper.find('.dialog-form').trigger('submit')
    expect(mocks.messageWarning).toHaveBeenCalledWith('请填写完整的用户信息')
    expect(wrapper.emitted('add')).toBeUndefined()

    const inputs = wrapper.findAll('.dialog-input')
    await inputs[0].setValue('new-user')
    await inputs[1].setValue('new-password')
    await selectAppOption(wrapper.find('.dialog-select'), 2)
    await wrapper.find('.dialog-form').trigger('submit')

    expect(wrapper.emitted('add')).toEqual([
      [
        {
          username: 'new-user',
          password: 'new-password',
          level: 2
        }
      ]
    ])

    await wrapper.find('.toolbar-button').trigger('click')
    expect((wrapper.findAll('.dialog-input')[0].element as HTMLInputElement).value).toBe('')
    expect((wrapper.findAll('.dialog-input')[1].element as HTMLInputElement).value).toBe('')
  })

  it('opens the edit dialog, emits update payloads, and closes on escape', async () => {
    const wrapper = createWrapper([{ username: 'bob', level: 2 }])

    await wrapper.findAll('button.table-link-button.primary')[0].trigger('click')

    const inputs = wrapper.findAll('.dialog-input')
    await inputs[0].setValue('bob-renamed')
    await inputs[1].setValue('reset-secret')
    await wrapper.find('.dialog-form').trigger('submit')

    expect(wrapper.emitted('update')).toEqual([
      [
        'bob',
        {
          username: 'bob-renamed',
          password: 'reset-secret'
        }
      ]
    ])

    await wrapper.findAll('button.table-link-button.primary')[0].trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('#edit-user-dialog-title').exists()).toBe(false)
  })

  it('confirms deletions and skips emission when the dialog is cancelled', async () => {
    mocks.confirm.mockResolvedValueOnce('confirm').mockRejectedValueOnce('cancel')

    const wrapper = createWrapper([{ username: 'bob', level: 2 }])

    await wrapper.findAll('button.table-link-button.danger')[0].trigger('click')
    await wrapper.vm.$nextTick()

    expect(mocks.confirm).toHaveBeenCalledWith(
      'translated:users.deleteConfirm',
      'translated:common.warning',
      {
        type: 'warning',
        confirmButtonText: 'translated:common.confirm',
        cancelButtonText: 'translated:common.cancel'
      }
    )
    expect(wrapper.emitted('delete')).toEqual([['bob']])

    await wrapper.findAll('button.table-link-button.danger')[0].trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('delete')).toEqual([['bob']])
  })
})
