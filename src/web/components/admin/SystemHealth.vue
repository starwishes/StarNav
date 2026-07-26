<template>
  <div class="system-health fade-in">
    <div class="header">
      <h3><AppIcon name="icon-md-laptop" class="title-icon" /> {{ t('health.title') }}</h3>
      <button
        type="button"
        class="refresh-button"
        :disabled="loading"
        :aria-label="t('health.refresh')"
        :title="t('health.refresh')"
        @click="fetchHealth"
      >
        <AppIcon name="icon-md-sync" class="refresh-icon" :class="{ spinning: loading }" />
      </button>
    </div>

    <div v-if="healthData" class="health-grid">
      <!-- 服务状态 -->
      <section class="card-shell status-card">
        <div class="status-indicator" :class="healthData.status">
          <div class="dot"></div>
          <span>{{ formatHealthStatus(healthData.status, t) }}</span>
        </div>
        <div class="version-info">
          <small>{{ t('health.version') }}: v{{ healthData.version }}</small>
          <small>{{ t('health.uptime') }}: {{ formatUptime(healthData.checks.uptime, t) }}</small>
        </div>
      </section>

      <!-- 内存占用 -->
      <section class="card-shell metric-card">
        <div class="card-header">{{ t('health.memory') }}</div>
        <div class="metric-item">
          <span>{{ t('health.rss') }}</span>
          <b>{{ healthData.checks.memory.rss }}</b>
        </div>
        <div class="metric-item">
          <span>{{ t('health.heap') }}</span>
          <b>{{ healthData.checks.memory.heapUsed }} / {{ healthData.checks.memory.heapTotal }}</b>
        </div>
      </section>

      <!-- 数据库 -->
      <section class="card-shell metric-card">
        <div class="card-header">{{ t('health.database') }}</div>
        <div class="metric-item">
          <span>{{ t('health.dbStatus') }}</span>
          <b class="status-text" :class="healthData.checks.database.ok ? 'is-ok' : 'is-error'">
            {{
              healthData.checks.database.ok ? t('health.dbConnected') : t('health.dbDisconnected')
            }}
          </b>
        </div>
        <div class="metric-item">
          <span>{{ t('health.dbSize') }}</span>
          <b>{{ formatSize(healthData.checks.database.size) }}</b>
        </div>
        <div class="metric-item">
          <span>{{ t('health.dbTables') }}</span>
          <b>{{ healthData.checks.database.tables }}</b>
        </div>
        <div class="metric-item">
          <span>{{ t('health.dbIntegrity') }}</span>
          <b class="status-text" :class="healthData.checks.database.ok ? 'is-ok' : 'is-error'">
            {{ formatQuickCheck(healthData.checks.database.quickCheck, t) }}
          </b>
        </div>
        <div class="metric-item">
          <span>{{ t('health.dbJournalMode') }}</span>
          <b>{{ healthData.checks.database.journalMode || 'unknown' }}</b>
        </div>
        <div class="metric-item">
          <span>{{ t('health.dbWritable') }}</span>
          <b>{{ formatBooleanState(healthData.checks.database.writable, t) }}</b>
        </div>
        <div class="metric-item metric-item-stack">
          <span>{{ t('health.dbPath') }}</span>
          <b>{{ healthData.checks.database.dbPath || '--' }}</b>
        </div>
        <div
          v-if="healthData.checks.database.error"
          class="metric-item metric-item-stack metric-item-error"
        >
          <span>{{ t('health.dbError') }}</span>
          <b>{{ healthData.checks.database.error }}</b>
        </div>
      </section>

      <!-- 缓存统计 -->
      <section class="card-shell metric-card">
        <div class="card-header">{{ t('health.cache') }}</div>
        <div class="metric-item">
          <span>{{ t('health.cacheHits') }} / {{ t('health.cacheMisses') }}</span>
          <b>{{ healthData.checks.cache.hits ?? 0 }} / {{ healthData.checks.cache.misses ?? 0 }}</b>
        </div>
        <div class="metric-item">
          <span>{{ t('health.cacheKeys') }}</span>
          <b>{{ healthData.checks.cache.keys ?? 0 }}</b>
        </div>
      </section>

      <section class="card-shell metric-card">
        <div class="card-header">{{ t('health.runtime') }}</div>
        <div class="metric-item">
          <span>{{ t('health.runtimeEnv') }}</span>
          <b>{{ healthData.checks.runtime.nodeEnv }}</b>
        </div>
        <div class="metric-item">
          <span>{{ t('health.runtimeCookieSecure') }}</span>
          <b>{{ formatCookieSecureMode(healthData.checks.runtime.authCookieSecureMode, t) }}</b>
        </div>
        <div class="metric-item">
          <span>{{ t('health.runtimeCspUpgrade') }}</span>
          <b>{{ formatBooleanState(healthData.checks.runtime.cspUpgradeInsecureRequests, t) }}</b>
        </div>
        <div class="metric-item">
          <span>{{ t('health.runtimeCorsOrigins') }}</span>
          <b>{{
            healthData.checks.runtime.corsOriginsConfigured
              ? t('health.runtimeConfigured')
              : t('health.runtimeDefault')
          }}</b>
        </div>
        <div class="metric-item metric-item-stack">
          <span>{{ t('health.runtimeDataDir') }}</span>
          <b>{{ healthData.checks.runtime.dataDir }}</b>
        </div>
        <div class="metric-item metric-item-stack">
          <span>{{ t('health.runtimeUploadsDir') }}</span>
          <b>{{ healthData.checks.runtime.uploadsDir }}</b>
        </div>
      </section>
    </div>

    <div v-else class="health-grid skeleton-grid" aria-hidden="true">
      <div class="card-shell skeleton-card status-card"></div>
      <div class="card-shell skeleton-card"></div>
      <div class="card-shell skeleton-card"></div>
      <div class="card-shell skeleton-card"></div>
      <div class="card-shell skeleton-card"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminApi, type HealthSummary } from '@/api/admin'
import { createScopedLogger } from '../../../shared/logger.js'
import {
  formatBooleanState,
  formatCookieSecureMode,
  formatHealthStatus,
  formatQuickCheck,
  formatSize,
  formatUptime
} from './systemHealthFormatters'

const { t } = useI18n()
const logger = createScopedLogger('web:system-health')
const loading = ref(false)
const healthData = ref<HealthSummary | null>(null)

const fetchHealth = async () => {
  loading.value = true
  try {
    healthData.value = await adminApi.getSystemHealth()
  } catch (error) {
    logger.error('Failed to fetch system health.', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchHealth)
</script>

<style scoped lang="scss">
@use './SystemHealth.scss';
</style>
