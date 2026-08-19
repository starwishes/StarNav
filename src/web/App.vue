<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useDataStore } from '@/store/data'
import { useAdminStore } from '@/store/admin'
import { useConfigStore } from '@/store/config'
import { createScopedLogger } from '../shared/logger.js'

const dataStore = useDataStore()
const adminStore = useAdminStore()
const configStore = useConfigStore()
const AUTH_CLEARED_EVENT = 'starnav:auth-cleared'
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
</style>
