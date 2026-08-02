<template>
  <div class="audit-log">
    <div class="header">
      <h3>{{ t('audit.title') }}</h3>
      <div class="actions">
        <div class="clear-group">
          <button type="button" class="table-button danger" @click="clearLogs" :disabled="loading">
            {{ t('audit.actionClear') }}
          </button>
          <select v-model="clearBeforeDays" class="clear-select" :disabled="loading">
            <option value="0">{{ t('audit.clearAll') }}</option>
            <option value="7">{{ t('audit.clearBeforeDays', { days: 7 }) }}</option>
            <option value="30">{{ t('audit.clearBeforeDays', { days: 30 }) }}</option>
            <option value="90">{{ t('audit.clearBeforeDays', { days: 90 }) }}</option>
          </select>
        </div>
        <button type="button" class="table-button" @click="fetchLogs" :disabled="loading">
          {{ loading ? t('common.loading') : t('common.refresh') }}
        </button>
      </div>
    </div>

    <div class="sn-table-shell" :class="{ 'is-loading': loading }" :aria-busy="loading">
      <div v-if="loading" class="table-loading">
        <div class="loading-spinner" aria-hidden="true"></div>
      </div>
      <div v-if="logs.length === 0 && !loading" class="sn-empty-state">
        {{ t('common.empty') || 'No data' }}
      </div>
      <div v-else class="sn-table-scroll">
        <table class="sn-table">
          <thead>
            <tr>
              <th>{{ t('common.time') }}</th>
              <th>{{ t('common.action') }}</th>
              <th>{{ t('common.username') }}</th>
              <th>{{ t('common.ip') }}</th>
              <th class="is-center">{{ t('common.status') }}</th>
              <th>{{ t('common.device') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>{{ formatTime(log.timestamp) }}</td>
              <td>
                <span class="sn-badge" :class="getActionTypeClass(log.action)">
                  {{ getActionLabel(log.action) }}
                </span>
              </td>
              <td>{{ log.username || '-' }}</td>
              <td>{{ log.ip || '-' }}</td>
              <td class="is-center">
                <span
                  v-if="log.success !== undefined"
                  class="sn-badge"
                  :class="log.success ? 'is-success' : 'is-danger'"
                >
                  {{ log.success ? t('common.success') : t('common.fail') }}
                </span>
                <span v-else>-</span>
              </td>
              <td>{{ parseUserAgent(log.userAgent) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="total > limit" class="sn-pagination">
      <div class="sn-pagination-meta">{{ t('common.total') }} {{ total }}</div>
      <div class="sn-pagination-controls">
        <button
          class="sn-pagination-button"
          :disabled="page <= 1"
          type="button"
          @click="handlePageChange(page - 1)"
        >
          ‹
        </button>
        <span class="sn-pagination-status">{{ page }} / {{ totalPages }}</span>
        <button
          class="sn-pagination-button"
          :disabled="page >= totalPages"
          type="button"
          @click="handlePageChange(page + 1)"
        >
          ›
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from '@/utils/feedback'
import { adminApi, type AuditLogRecord } from '@/api/admin'
import { useDateTimeFormatter } from '@/composables/useDateTimeFormatter'
import { describeUserAgent } from '@/utils/userAgent'
import { createScopedLogger } from '../../../shared/logger.js'
import { getAuditActionLabel, getAuditActionTypeClass } from './auditLogHelpers'

const { t } = useI18n()
const { formatDateTime } = useDateTimeFormatter()
const logger = createScopedLogger('web:audit-log')
const logs = ref<AuditLogRecord[]>([])
const loading = ref(false)
const page = ref(1)
const limit = ref(50)
const total = ref(0)
const clearBeforeDays = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

const fetchLogs = async () => {
  loading.value = true
  try {
    const result = await adminApi.getAuditLogs(page.value, limit.value)
    logs.value = result.logs
    total.value = result.total
  } catch (err) {
    logger.error('Failed to fetch audit logs.', err)
    ElMessage.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

const clearLogs = async () => {
  try {
    let confirmMessage = t('audit.clearConfirm')
    const before =
      clearBeforeDays.value > 0
        ? // 使用 UTC 日期计算，与 SQLite datetime('now') 存储格式一致（均为 UTC）
          new Date(Date.now() - clearBeforeDays.value * 86400000).toISOString().split('T')[0] +
          ' 00:00:00'
        : undefined

    if (before) {
      confirmMessage = t('audit.clearBeforeConfirm', { date: before.split(' ')[0] })
    }

    await ElMessageBox.confirm(confirmMessage, t('common.warning'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })

    const data = await adminApi.clearAuditLogs(before)
    if (data.success) {
      ElMessage.success(t('audit.clearSuccess'))
      fetchLogs()
    } else {
      ElMessage.error(data.error || t('common.fail'))
    }
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(t('common.fail'))
  }
}

const handlePageChange = (newPage: number) => {
  page.value = newPage
  fetchLogs()
}

const formatTime = (timestamp: string) => formatDateTime(timestamp)
const getActionTypeClass = getAuditActionTypeClass
const getActionLabel = (action: string) => getAuditActionLabel(action, t)
const parseUserAgent = (ua: string) => describeUserAgent(ua, '-')

onMounted(fetchLogs)
</script>

<style scoped lang="scss">
.audit-log {
  --audit-button-bg: rgba(255, 255, 255, 0.92);
  --audit-button-border: rgba(148, 163, 184, 0.22);
  --audit-button-text: var(--gray-700);
  --audit-danger-bg: rgba(239, 68, 68, 0.12);
  --audit-danger-border: rgba(239, 68, 68, 0.2);
  --audit-danger-text: #b91c1c;
  --audit-loading-bg: rgba(255, 255, 255, 0.62);
  color: var(--ui-text-primary, #0f172a);

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      margin: 0;
      font-size: 16px;
    }
  }
}

:global(:root[theme-mode='dark'] .audit-log) {
  --audit-button-bg: rgba(15, 23, 42, 0.92);
  --audit-button-border: rgba(148, 163, 184, 0.24);
  --audit-button-text: rgba(226, 232, 240, 0.88);
  --audit-danger-bg: rgba(239, 68, 68, 0.18);
  --audit-danger-border: rgba(248, 113, 113, 0.22);
  --audit-danger-text: #fca5a5;
  --audit-loading-bg: rgba(2, 6, 23, 0.56);
}

:global(:root[theme-mode='dark'] .audit-log .clear-select) {
  background: var(--audit-button-bg);
  color: var(--audit-button-text);
}

:global(:root[theme-mode='dark'] .audit-log .clear-select option) {
  background: #1e293b;
  color: rgba(226, 232, 240, 0.88);
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.clear-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.clear-select {
  border: 1px solid var(--audit-button-border);
  border-radius: 999px;
  background: var(--audit-button-bg);
  color: var(--audit-button-text);
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: border-color 0.18s ease;
}

.clear-select:focus {
  border-color: var(--sk-focus-color, #0071e3);
}

.table-button {
  border: 1px solid var(--audit-button-border);
  border-radius: 999px;
  background: var(--audit-button-bg);
  color: var(--audit-button-text);
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.table-button.danger {
  background: var(--audit-danger-bg);
  border-color: var(--audit-danger-border);
  color: var(--audit-danger-text);
}

.sn-table-shell {
  position: relative;
}

.table-loading {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--audit-loading-bg);
  backdrop-filter: blur(2px);
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(var(--ui-theme-rgb), 0.15);
  border-top-color: rgb(var(--ui-theme-rgb));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
