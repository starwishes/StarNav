type Translate = (key: string) => string

export const getAuditActionTypeClass = (action: string) => {
  const types: Record<string, string> = {
    login: 'is-primary',
    logout: 'is-info',
    register: 'is-success',
    revoke_sessions: 'is-warning'
  }
  return types[action] || 'is-neutral'
}

export const getAuditActionLabel = (action: string, t: Translate) => {
  const labels: Record<string, string> = {
    login: t('audit.actionLogin'),
    logout: t('audit.actionLogout'),
    register: t('audit.actionRegister'),
    revoke_sessions: t('audit.actionRevoke')
  }
  return labels[action] || action
}
