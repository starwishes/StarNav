export const createAddUserForm = () => ({
  username: '',
  password: '',
  level: 1
})

export const createEditUserForm = (username = '') => ({
  newUsername: username,
  password: ''
})

export const buildUserUpdatePayload = (newUsername: string, password: string) => ({
  // Backend accountService.update expects `newUsername`, not `username`.
  newUsername,
  password: password || undefined
})

export const getUserLevelTranslationKey = (level: number) => {
  const keys = ['guest', 'user', 'vip', 'admin']
  return `userLevel.${keys[level] || 'unknown'}`
}

export const getUserLevelClass = (level: number) => {
  const classes = ['is-success', 'is-info', 'is-warning', 'is-danger']
  return classes[level] || 'is-neutral'
}

export const isLevelChangeDisabled = (username: string) => username === 'admin'

export const isEditDisabled = (username: string, currentLogin?: string) =>
  username === 'admin' && currentLogin !== 'admin'

export const isDeleteDisabled = (username: string, currentLogin?: string) =>
  username === 'admin' || username === currentLogin
