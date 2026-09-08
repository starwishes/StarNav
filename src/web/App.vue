<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useDataStore } from '@/store/data'
import { useAdminStore } from '@/store/admin'
import { useConfigStore } from '@/store/config'
import { AUTH_CLEARED_EVENT } from '@/utils/events'
import { createScopedLogger } from '../shared/logger.js'

const dataStore = useDataStore()
const adminStore = useAdminStore()
const configStore = useConfigStore()
const logger = createScopedLogger('web:app')

let lastSyncTime = 0
const SYNC_THRESHOLD = 5000

// 认证状态变化（登录成功 / 主动登出 / 401 清态）后，首页数据必须按新权限级重取：
// 登出不刷新会残留 level1-3 私有书签（同机旁站可见），登录不刷新则只见游客视图。
// loadData 自带 in-flight 去重与写操作在途保护，直接调用安全（第 32 轮 Kimi 视角 M1）。
watch(
  () => adminStore.isAuthenticated,
  () => {
    dataStore.loadData()
  }
)

const handleVisibilityChange = () => {
  if (document.visibilityState !== 'visible') {
    return
  }

  // 游客与管理员一视同仁：回前台时若距上次同步 >5s 则刷新数据，避免游客标签页永远
  // 看不到管理员刚做的改动（loadData 自带 in-flight 去重与写操作在途保护，放开无副作用，
  // 第 30 轮盲审 L1）
  const now = Date.now()
  if (now - lastSyncTime > SYNC_THRESHOLD) {
    lastSyncTime = now
    dataStore.loadData()
  }
}

const handleAuthCleared = () => {
  adminStore.clearAuth()
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared)

  configStore.ensureLoaded().catch((error) => {
    logger.error('Failed to initialize public settings.', error)
  })
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared)
})
</script>

<template>
  <router-view />
</template>

<style>
::-webkit-scrollbar {
  width: 0;
}

/* 长内容/宽表格滚动区恢复可见滚动条：全局隐藏只作用于装饰性页面滚动，
   数据表格（横向滚动）必须有可见滚动条才能感知还有更多内容。 */
.sn-table-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.sn-table-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.42);
  border-radius: 999px;
}

.sn-table-scroll::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.1);
}
</style>
