const WINDOWS_AGENTS = [
  ['Edge', 'Windows Edge'],
  ['Chrome', 'Windows Chrome'],
  ['Firefox', 'Windows Firefox']
] as const

const MAC_AGENTS = [
  ['Safari', 'Mac Safari'],
  ['Chrome', 'Mac Chrome']
] as const

export const describeUserAgent = (userAgent: string, fallback = 'unknown') => {
  if (!userAgent || userAgent === 'unknown') {
    return fallback
  }

  if (userAgent.includes('Windows')) {
    const match = WINDOWS_AGENTS.find(([token]) => userAgent.includes(token))
    return match?.[1] || 'Windows'
  }

  if (userAgent.includes('Mac')) {
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Mac Safari'
    }

    const match = MAC_AGENTS.find(([token]) => userAgent.includes(token))
    return match?.[1] || 'Mac'
  }

  if (userAgent.includes('iPhone')) return 'iPhone'
  if (userAgent.includes('iPad')) return 'iPad'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('Linux')) return 'Linux'

  return `${userAgent.substring(0, 30)}...`
}
