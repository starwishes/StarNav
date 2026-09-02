<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
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

const handleVisibilityChange = () => {
  if (document.visibilityState !== 'visible') {
    return
  }

  const now = Date.now()
  if (adminStore.isAuthenticated && now - lastSyncTime > SYNC_THRESHOLD) {
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
