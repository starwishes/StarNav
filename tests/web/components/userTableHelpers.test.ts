import { describe, expect, it } from 'vitest'

import {
  buildUserUpdatePayload,
  createAddUserForm,
  createEditUserForm,
  getUserLevelClass,
  getUserLevelTranslationKey,
  isDeleteDisabled,
  isEditDisabled,
  isLevelChangeDisabled
} from '@/components/admin/userTableHelpers'

describe('userTableHelpers', () => {
  it('creates default add/edit forms', () => {
    expect(createAddUserForm()).toEqual({
      username: '',
      password: '',
      level: 1
    })

    expect(createEditUserForm('alice')).toEqual({
      newUsername: 'alice',
      password: ''
    })
  })

  it('builds update payloads and omits empty passwords', () => {
    expect(buildUserUpdatePayload('alice', '')).toEqual({
      username: 'alice',
      password: undefined
    })

    expect(buildUserUpdatePayload('alice', 'secret')).toEqual({
      username: 'alice',
      password: 'secret'
    })
  })

  it('maps user levels to translation keys and badge classes', () => {
    expect(getUserLevelTranslationKey(1)).toBe('userLevel.user')
    expect(getUserLevelTranslationKey(3)).toBe('userLevel.admin')
    expect(getUserLevelClass(2)).toBe('is-warning')
    expect(getUserLevelClass(9)).toBe('is-neutral')
  })

  it('evaluates admin action disable rules', () => {
    expect(isLevelChangeDisabled('admin')).toBe(true)
    expect(isLevelChangeDisabled('alice')).toBe(false)

    expect(isEditDisabled('admin', 'alice')).toBe(true)
    expect(isEditDisabled('admin', 'admin')).toBe(false)

    expect(isDeleteDisabled('admin', 'admin')).toBe(true)
    expect(isDeleteDisabled('alice', 'alice')).toBe(true)
    expect(isDeleteDisabled('alice', 'bob')).toBe(false)
  })
})
