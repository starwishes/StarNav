import { api, ApiResponse, getApiField, unwrapApiPayload } from './client'
import type { Category, SiteConfig, Item, SystemSettings } from '@/types'
import { adminApi } from './admin'
import type { SearchSuggestionProviderType } from '../../shared/searchSuggestionProviders.js'

export type { SystemSettings, User } from '@/types'

// API 响应类型定义
export interface LoginResponse {
  token: string
  user: { login: string; name: string; level: number }
  sessionId: string
}

export type DataSavePayload =
  | SiteConfig
  | (SiteConfig & { action?: string })
  | { content: SiteConfig; action?: string }

export interface LinkCheckResult {
  url: string
  status: string
}

type RequestOptions = Pick<RequestInit, 'signal'>

export type BookmarkMutationPayload = Partial<
  Pick<Item, 'name' | 'url' | 'description' | 'categoryId' | 'icon' | 'pinned' | 'level'>
>

export type CategoryMutationPayload = Partial<
  Pick<Category, 'name' | 'icon' | 'parentId' | 'level'>
>

type PublicSettingsResponse = ApiResponse<SystemSettings> & Partial<SystemSettings>
type LinkCheckResponse = ApiResponse<{ results: LinkCheckResult[] }> & {
  results?: LinkCheckResult[]
}
type SuggestionsResponse = ApiResponse<{ items: string[] }> & {
  items?: string[]
}
type BookmarkMutationResponse = ApiResponse<{ item: Item }> & {
  item?: Item
}
type CategoryMutationResponse = ApiResponse<{ item: Category }> & {
  item?: Category
}
type CategoryReorderResponse = ApiResponse<{ categories: Category[] }> & {
  categories?: Category[]
}
type BookmarkBatchMutationResponse = ApiResponse<{ items: Item[]; count: number }> & {
  items?: Item[]
  count?: number
}
type CountResponse = ApiResponse<{ count: number }> & {
  count?: number
}

const readMutationItem = <T>(
  payload: ApiResponse<{ item: T }> & {
    item?: T
  }
) =>
  getApiField<T | null>(
    payload as ApiResponse<Record<string, unknown>> | Record<string, unknown>,
    'item',
    null
  )

const readMutationItems = <T>(
  payload: ApiResponse<{ items: T[] }> & {
    items?: T[]
  }
) =>
  getApiField<T[]>(
    payload as ApiResponse<Record<string, unknown>> | Record<string, unknown>,
    'items',
    []
  )

// 数据相关 API
export const dataApi = {
  // 获取全量数据
  getContent: () => api.get<ApiResponse<SiteConfig>>('/data').then(unwrapApiPayload<SiteConfig>),

  // 更新全量数据
  saveContent: (payload: DataSavePayload) => api.post<ApiResponse>('/data', payload),

  addCategory: (payload: CategoryMutationPayload) =>
    api.post<CategoryMutationResponse>('/category', payload).then(readMutationItem<Category>),

  updateCategory: (categoryId: number, payload: CategoryMutationPayload) =>
    api
      .put<CategoryMutationResponse>(`/category/${categoryId}`, payload)
      .then(readMutationItem<Category>),

  reorderCategories: (orderedIds: number[]) =>
    api
      .put<CategoryReorderResponse>('/categories/reorder', { orderedIds })
      .then((payload) => getApiField<Category[]>(payload, 'categories', [])),

  deleteCategory: (categoryId: number) => api.del<ApiResponse>(`/category/${categoryId}`),

  addItem: (payload: BookmarkMutationPayload) =>
    api.post<BookmarkMutationResponse>('/bookmark', payload).then(readMutationItem<Item>),

  updateItem: (itemId: number, payload: BookmarkMutationPayload) =>
    api.put<BookmarkMutationResponse>(`/bookmark/${itemId}`, payload).then(readMutationItem<Item>),

  moveItem: (itemId: number, payload: { categoryId: number; targetIndex: number }) =>
    api
      .put<BookmarkMutationResponse>(`/bookmark/${itemId}/move`, payload)
      .then(readMutationItem<Item>),

  batchMoveItems: (ids: number[], categoryId: number) =>
    api
      .post<BookmarkBatchMutationResponse>('/bookmark/batch-move', { ids, categoryId })
      .then(readMutationItems<Item>),

  batchDeleteItems: (ids: number[]) =>
    api
      .post<CountResponse>('/bookmark/batch-delete', { ids })
      .then((payload) => getApiField<number>(payload, 'count', 0)),

  deleteItem: (itemId: number) => api.del<ApiResponse>(`/bookmark/${itemId}`),

  // 记录点击
  trackClick: (itemId: number) => {
    return api.post<ApiResponse<{ item: Item }>>(`/sites/${itemId}/click`, {})
  }
}

export const publicApi = {
  getSettings: () =>
    api.get<PublicSettingsResponse>('/settings').then(unwrapApiPayload<SystemSettings>)
}

export const toolApi = {
  getSuggestions: (
    keyword: string,
    type: SearchSuggestionProviderType,
    options: RequestOptions = {}
  ) =>
    api
      .get<SuggestionsResponse>(
        `/suggest?keyword=${encodeURIComponent(keyword)}&type=${type}`,
        options
      )
      .then((payload) => getApiField<string[]>(payload, 'items', [])),

  checkLinks: async (urls: string[]) => {
    const payload = await api.post<LinkCheckResponse>('/check-links', { urls })
    return getApiField<LinkCheckResult[]>(payload, 'results', [])
  }
}

// 认证相关 API
export const authApi = {
  login: (credentials: { username: string; password: string }) => {
    return adminApi.login(credentials)
  },

  logout: () => {
    return api.post<ApiResponse>('/logout', {})
  },

  register: (credentials: { username: string; password: string }) => {
    return adminApi.register(credentials)
  }
}
