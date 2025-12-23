import { defineStore } from 'pinia';
import { ref } from 'vue';

interface User {
  login: string;
  name: string;
  avatar_url: string;
}

export const useAdminStore = defineStore('admin', () => {
  const token = ref<string | null>(localStorage.getItem('admin_token'));
  const user = ref<User | null>(
    localStorage.getItem('admin_user')
      ? JSON.parse(localStorage.getItem('admin_user')!)
      : null
  );
  const isAuthenticated = ref<boolean>(!!token.value);

  // 设置认证信息
  const setAuth = (newToken: string, newUser: User) => {
    token.value = newToken;
    user.value = newUser;
    isAuthenticated.value = true;
    localStorage.setItem('admin_token', newToken);
    localStorage.setItem('admin_user', JSON.stringify(newUser));
  };

  // 清除认证信息
  const clearAuth = () => {
    token.value = null;
    user.value = null;
    isAuthenticated.value = false;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  // 本地登录
  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }

      setAuth(data.token, data.user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // 获取文件内容
  const getFileContent = async () => {
    try {
      const response = await fetch('/api/data');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取文件失败');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || '获取文件失败');
    }
  };

  // 更新文件内容
  const updateFileContent = async (content: any) => {
    if (!token.value) {
      throw new Error('未授权');
    }

    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`,
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '更新文件失败');
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || '更新文件失败');
    }
  };

  return {
    token,
    user,
    isAuthenticated,
    setAuth,
    clearAuth,
    login,
    getFileContent,
    updateFileContent,
  };
});

