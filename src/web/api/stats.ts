import { api, type ApiResponse, unwrapApiPayload } from './client'

export interface StatsTrendPoint {
  date: string
  pv: number
  uv: number
}

export interface StatsDistributionEntry {
  name: string
  value: number
}

export interface StatsSummary {
  today_pv: number
  today_uv: number
  total_pv: number
  total_uv: number
  trend: StatsTrendPoint[]
  distribution: {
    os: StatsDistributionEntry[]
    browser: StatsDistributionEntry[]
  }
}

type StatsResponse = ApiResponse<StatsSummary> & Partial<StatsSummary>

export function getStatsSummary() {
  return api.get<StatsResponse>('/stats').then(unwrapApiPayload<StatsSummary>)
}

export async function recordVisit(url: string) {
  const response = await fetch('/api/visit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.text()
}
