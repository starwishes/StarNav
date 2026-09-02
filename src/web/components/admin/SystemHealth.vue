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
      </section>
    </div>

    <div v-else-if="loadFailed" class="health-grid error-state">
      <section class="card-shell error-card" role="status">
        <p class="error-title">{{ t('health.loadFailed') }}</p>
        <button
          type="button"
          class="refresh-button error-retry"
          :disabled="loading"
          @click="fetchHealth"
        >
          <AppIcon name="icon-md-sync" class="refresh-icon" :class="{ spinning: loading }" />
          {{ t('common.retry') }}
        </button>
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
const loadFailed = ref(false)

const fetchHealth = async () => {
  loading.value = true
  try {
    healthData.value = await adminApi.getSystemHealth()
    loadFailed.value = false
  } catch (error) {
    // 失败不再无限停留在骨架屏：切到错误态，让用户主动重试。
    loadFailed.value = true
    logger.error('Failed to fetch system health.', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchHealth)
</script>

<style scoped lang="scss">
.system-health {
  --health-card-bg: var(--ui-panel-bg, rgba(255, 255, 255, 0.94));
  --health-card-border: var(--ui-panel-border, rgba(255, 255, 255, 0.62));
  --health-button-bg: var(--ui-panel-surface, rgba(255, 255, 255, 0.88));
  --health-button-border: rgba(148, 163, 184, 0.2);
  --health-skeleton-base: rgba(226, 232, 240, 0.45);
  --health-skeleton-highlight: rgba(255, 255, 255, 0.78);
  color: var(--ui-text-primary, #0f172a);

  container-type: inline-size;
  container-name: system-health;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;

    h3 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--gray-800);
      font-size: 16px;
      font-weight: 700;
      white-space: nowrap;
    }
  }

  .health-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
  }

  @container system-health (max-width: 640px) {
    .health-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }
  }

  .status-card {
    grid-column: 1 / -1;
    background: linear-gradient(135deg, rgba(var(--ui-theme-rgb), 0.05), transparent);

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 10px;

      &.healthy {
        color: var(--green-600);

        .dot {
          background: var(--green-500);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.55);
        }
      }

      &.degraded {
        color: #b45309;

        .dot {
          background: #f59e0b;
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.45);
        }
      }

      &.unhealthy {
        color: var(--red-600);

        .dot {
          background: var(--red-500);
        }
      }

      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }
    }
    .version-info {
      display: flex;
      gap: 20px;
      color: var(--gray-500);
    }
  }

  .metric-card {
    .card-header {
      font-weight: 600;
      font-size: 14px;
      color: var(--gray-600);
      margin-bottom: 14px;
    }

    .metric-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      span {
        color: var(--gray-500);
        font-size: 13px;
      }

      b {
        color: var(--gray-800);
        font-size: 13px;
      }
    }

    .metric-item-stack {
      align-items: flex-start;
      flex-direction: column;
      gap: 6px;
    }

    .metric-item-stack b {
      word-break: break-word;
      text-align: left;
    }

    .metric-item-error b {
      color: var(--red-600);
      word-break: break-word;
    }

    .status-text.is-ok {
      color: var(--green-600);
    }

    .status-text.is-error {
      color: var(--red-600);
    }
  }
}

:global(:root[theme-mode='dark'] .system-health) {
  --health-card-bg: rgba(15, 23, 42, 0.84);
  --health-card-border: rgba(148, 163, 184, 0.2);
  --health-button-bg: rgba(15, 23, 42, 0.9);
  --health-button-border: rgba(148, 163, 184, 0.24);
  --health-skeleton-base: rgba(51, 65, 85, 0.42);
  --health-skeleton-highlight: rgba(148, 163, 184, 0.16);
}

.title-icon {
  width: 18px;
  height: 18px;
}

.refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--health-button-border);
  border-radius: 999px;
  background: var(--health-button-bg);
  color: var(--gray-700);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: rgba(var(--ui-theme-rgb), 0.25);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
    color: rgb(var(--ui-theme-rgb));
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.refresh-icon {
  width: 18px;
  height: 18px;
}

.refresh-icon.spinning {
  animation: spin 0.8s linear infinite;
}

.card-shell {
  padding: 20px;
  border-radius: 18px;
  border: 1px solid var(--health-card-border);
  background: var(--health-card-bg);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
}

.skeleton-card {
  min-height: 150px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      var(--health-skeleton-base),
      var(--health-skeleton-highlight),
      var(--health-skeleton-base)
    );
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }
}

.error-state {
  grid-template-columns: 1fr;
}

.error-card {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--gray-500);
}

.error-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.error-retry {
  width: auto;
  padding: 0 18px;
  font-size: 13px;
  font-weight: 600;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.8;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}
</style>
