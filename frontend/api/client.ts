// ElMessage removed

// 定义 API 响应结构
export interface ApiResponse<T = any> {
    success?: boolean;
    error?: string;
    token?: string;
    user?: any;
    content?: T;
    data?: T;
}

const BASE_URL = '/api';

/**
 * 统一的 Fetch 封装
 */
async function client<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('admin_token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const config: RequestInit = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            // 让调用者决定是否弹出错误，或者在这里统一弹出？
            // 为了灵活性，最好抛出 Error，由 store 或 component 处理 UI
            // 但对于 401，可以统一处理 redirect
            if (response.status === 401) {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
                // 可选: window.location.href = '/login';
            }
            throw new Error(data.error || `HTTP Error ${response.status}`);
        }

        return data as T;
    } catch (error: any) {
        console.error(`API Request Failed: ${endpoint}`, error);
        throw error;
    }
}

export const api = {
    get: <T>(url: string) => client<T>(url, { method: 'GET' }),
    post: <T>(url: string, body: any) => client<T>(url, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(url: string, body: any) => client<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(url: string, body: any) => client<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
    del: <T>(url: string) => client<T>(url, { method: 'DELETE' }),
};
