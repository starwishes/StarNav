import {
  ApiClientError,
  api,
  getApiField,
  mergeApiPayload,
  type ApiResponse,
  unwrapApiPayload
} from './client'
import type { AuthUser } from '@/types'
import type { SystemSettings, User } from './index'

export interface SessionRecord {
  sessionId: string
  ip: string
  userAgent: string
  createdAt: string
  lastActiveAt: string
  isCurrent: boolean
}

export interface AuditLogRecord {
  id: number
  action: string
  username: string
  ip: string
  userAgent: string
  success?: boolean
  timestamp: string
  details?: string
}

export interface UploadedFile {
  filename: string
  url: string
  size: number
  uploadedAt: string
}

export interface HealthSummary {
  status: string
  version: string
  timestamp: string
  checks: {
    uptime: number
    memory: {
      rss: string
      heapUsed: string
      heapTotal: string
    }
    database: {
      ok: boolean
      size: number
      tables: number
      categoryCount?: number
      itemCount?: number
      userCount?: number
      fileExists?: boolean
      writable?: boolean
      journalMode?: string
      quickCheck?: string
      error?: string
    }
    cache: {
      hits: number
      misses: number
      keys: number
    }
    runtime: {
      nodeEnv: string
      authCookieSecureMode: 'auto' | 'always' | 'never'
      cspUpgradeInsecureRequests: boolean
      corsOriginsConfigured: boolean
    }
  }
}

export interface LoginResponse {
  // 浏览器 Web 请求（http/https Origin/Referer）响应体剥离 token（仅 HttpOnly Cookie）；
  // 扩展（chrome-extension:// 等）与 CLI/无 Origin 客户端响应体保留 token 供 Bearer 使用。
  token?: string
  user: AuthUser
  sessionId: string
}

type UpdateUserPayload = Partial<User & { password?: string; newUsername?: string }>
type AuthResponse = ApiResponse<Partial<LoginResponse>> & Partial<LoginResponse>
type SessionsResponse = ApiResponse<{ sessions: SessionRecord[] }> & {
  sessions?: SessionRecord[]
}
type AuditLogsResponse = ApiResponse<{ logs: AuditLogRecord[]; total: number }> & {
  logs?: AuditLogRecord[]
  total?: number
}
type RevokeOthersResponse = ApiResponse<{ revokedCount: number }> & {
  revokedCount?: number
}
type UploadsResponse = ApiResponse<{ files: UploadedFile[] }> & {
  files?: UploadedFile[]
}
const parseAuditLogRecord = (record: AuditLogRecord) => {
  if (!record.details) {
    return record
  }

  try {
    const details = JSON.parse(record.details) as {
      success?: boolean
      userAgent?: string
      message?: string
    }

    return {
      ...record,
      success: details.success ?? record.success,
      userAgent: details.userAgent || record.userAgent
    }
  } catch {
    return record
  }
}

type HealthResponse = ApiResponse<HealthSummary> & Partial<HealthSummary>
type AssetUploadResponse = ApiResponse<{ url: string }> & {
  url?: string
}

export const adminApi = {
  login: (credentials: { username: string; password: string; remember?: boolean }) =>
    api
      .post<AuthResponse>('/login', credentials)
      .then((payload) => mergeApiPayload<Partial<LoginResponse>>(payload)),

  register: (credentials: { username: string; password: string }) =>
    api.post<ApiResponse>('/register', credentials),

  getAdminSettings: async () =>
    unwrapApiPayload<SystemSettings>(await api.get<ApiResponse<SystemSettings>>('/admin/settings')),

  updateAdminSettings: (settings: Partial<SystemSettings>) =>
    api.post<ApiResponse>('/admin/settings', settings),

  getUsers: () =>
    api.get<ApiResponse<User[]> | User[]>('/admin/users').then(unwrapApiPayload<User[]>),

  addUser: (user: { username: string; password: string; level?: number }) =>
    api.post<ApiResponse>('/admin/users', user),

  deleteUser: (username: string) => api.del<ApiResponse>(`/admin/users/${username}`),

  updateUser: (username: string, data: UpdateUserPayload) =>
    api.patch<ApiResponse>(`/admin/users/${username}`, data),

  getSessions: async () => {
    const payload = await api.get<SessionsResponse>('/sessions')
    return getApiField<SessionRecord[]>(payload, 'sessions', [])
  },

  revokeSession: (sessionId: string) => api.del<ApiResponse>(`/sessions/${sessionId}`),

  revokeOtherSessions: async () => {
    const payload = await api.post<RevokeOthersResponse>('/sessions/revoke-others', {})
    return getApiField<number>(payload, 'revokedCount', 0)
  },

  getAuditLogs: async (page: number, limit: number) => {
    const payload = await api.get<AuditLogsResponse>(`/admin/audit?page=${page}&limit=${limit}`)
    return {
      logs: getApiField<AuditLogRecord[]>(payload, 'logs', []).map(parseAuditLogRecord),
      total: getApiField<number>(payload, 'total', 0)
    }
  },

  clearAuditLogs: (before?: string) => {
    const query = before ? `/admin/audit?before=${encodeURIComponent(before)}` : '/admin/audit'
    return api.del<ApiResponse>(query)
  },

  getUploadedFiles: async () => {
    const payload = await api.get<UploadsResponse>('/uploads')
    return getApiField<UploadedFile[]>(payload, 'files', [])
  },

  uploadBackgroundAsset: (data: string, filename: string) =>
    api
      .post<AssetUploadResponse>('/upload-background', {
        data,
        filename
      })
      .then((payload) => ({
        ...payload,
        url: getApiField<string>(payload, 'url', '')
      })),

  uploadIconAsset: (data: string) =>
    api.post<AssetUploadResponse>('/upload-icon', { data }).then((payload) => ({
      ...payload,
      url: getApiField<string>(payload, 'url', '')
    })),

  deleteUpload: (filename: string) =>
    api.del<ApiResponse>(`/uploads/${encodeURIComponent(filename)}`),

  getSystemHealth: async () => {
    try {
      return unwrapApiPayload<HealthSummary>(await api.get<HealthResponse>('/health'))
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 503 && error.payload) {
        return unwrapApiPayload<HealthSummary>(error.payload as HealthResponse)
      }

      throw error
    }
  }
}
