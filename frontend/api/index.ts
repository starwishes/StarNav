import { api, ApiResponse } from './client';
import { SiteConfig } from '@/types';

// 数据相关 API
export const dataApi = {
    // 获取全量数据 (支持指定用户，管理员用)
    getContent: (username?: string) => {
        const url = username ? `/data?user=${username}` : '/data';
        return api.get<ApiResponse<SiteConfig>>(url);
    },

    // 更新全量数据
    saveContent: (content: SiteConfig) => {
        return api.post<ApiResponse>('/data', content);
    },

    // 记录点击 (不做强类型检查，因为返回值可能只是 success)
    trackClick: (itemId: number, username: string) => {
        return api.post(`/sites/${itemId}/click?user=${username}`, {});
    }
};

// 认证相关 API
export const authApi = {
    login: (credentials: { username: string; password: string }) => {
        return api.post<ApiResponse<any>>('/login', credentials);
    },

    register: (credentials: { username: string; password: string }) => {
        return api.post<ApiResponse<any>>('/register', credentials);
    },

    updateProfile: (profile: any) => {
        return api.patch<ApiResponse<any>>('/profile', profile);
    },

    // 管理员接口
    admin: {
        getSettings: () => api.get<any>('/admin/settings'),
        updateSettings: (settings: any) => api.post<any>('/admin/settings', settings),
        getUsers: () => api.get<any[]>('/admin/users'),
        addUser: (user: any) => api.post<any>('/admin/users', user),
        deleteUser: (username: string) => api.del<any>(`/admin/users/${username}`),
        updateUser: (username: string, data: any) => api.patch<any>(`/admin/users/${username}`, data),
    }
};
