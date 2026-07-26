<template>
  <div class="audit-log">
    <div class="header">
      <h3>{{ t('audit.title') }}</h3>
      <div class="actions">
        <button type="button" class="table-button danger" @click="clearLogs" :disabled="loading">
          {{ t('audit.actionClear') }}
        </button>
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
    await ElMessageBox.confirm(t('audit.clearConfirm'), t('common.warning'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })

    const data = await adminApi.clearAuditLogs()
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
@use './AuditLog.scss';
</style>
