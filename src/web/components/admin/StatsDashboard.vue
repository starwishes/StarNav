<template>
  <div class="stats-dashboard">
    <div class="section-title">
      <i class="fas fa-chart-line"></i> {{ t('stats.accessOverview') }}
    </div>

    <div class="stats-cards">
      <div v-for="card in accessCards" :key="card.label" class="stat-card glass-card">
        <div class="stat-icon" :style="card.iconStyle">
          <i :class="card.icon"></i>
        </div>
        <div class="stat-info">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value">{{ card.value }}</div>
        </div>
      </div>
    </div>

    <div class="charts-container">
      <TrendChartCard
        class="span-2"
        :title="t('stats.visitTrend')"
        :empty-label="t('common.noData')"
        :chart-data="trendChartData"
      />
      <DistributionChartCard
        :title="t('stats.osDistribution')"
        :distribution="osDistribution"
        :empty-label="t('common.noData')"
        :total-label="t('stats.total')"
      />
      <DistributionChartCard
        :title="t('stats.browserDistribution')"
        :distribution="browserDistribution"
        :empty-label="t('common.noData')"
        :total-label="t('stats.total')"
      />
    </div>

    <div class="section-title section-spacing">
      <i class="fas fa-database"></i> {{ t('stats.contentOverview') }}
    </div>

    <div class="simple-stats-grid">
      <div class="stat-card-simple">
        <div class="stat-value">{{ totalBookmarks }}</div>
        <div class="stat-label">{{ t('stats.totalBookmarks') }}</div>
      </div>
      <div class="stat-card-simple">
        <div class="stat-value">{{ totalCategories }}</div>
        <div class="stat-label">{{ t('stats.totalCategories') }}</div>
      </div>
      <div class="stat-card-simple">
        <div class="stat-value">{{ totalClicks }}</div>
        <div class="stat-label">{{ t('stats.totalClicks') }}</div>
      </div>
      <div v-if="totalUsers > 0" class="stat-card-simple">
        <div class="stat-value">{{ totalUsers }}</div>
        <div class="stat-label">{{ t('stats.totalUsers') }}</div>
      </div>
    </div>

    <TopBookmarksTable :title="`🔥 ${t('stats.topBookmarks')}`" :items="topBookmarks" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStatsDashboard } from '@/composables/admin/useStatsDashboard'
import DistributionChartCard from '@/components/admin/stats/DistributionChartCard.vue'
import TopBookmarksTable from '@/components/admin/stats/TopBookmarksTable.vue'
import TrendChartCard from '@/components/admin/stats/TrendChartCard.vue'

const { t } = useI18n()
const {
  accessStats,
  totalClicks,
  totalBookmarks,
  totalCategories,
  totalUsers,
  topBookmarks,
  trendChartData,
  osDistribution,
  browserDistribution
} = useStatsDashboard()

const accessCards = computed(() => [
  {
    label: t('stats.todayPV'),
    value: accessStats.value?.today_pv || 0,
    icon: 'fas fa-eye',
    iconStyle: undefined
  },
  {
    label: t('stats.todayUV'),
    value: accessStats.value?.today_uv || 0,
    icon: 'fas fa-user',
    iconStyle: 'background: rgba(52, 211, 153, 0.2); color: #34d399'
  },
  {
    label: t('stats.totalPV'),
    value: accessStats.value?.total_pv || 0,
    icon: 'fas fa-globe',
    iconStyle: 'background: rgba(96, 165, 250, 0.2); color: #60a5fa'
  },
  {
    label: t('stats.totalUV'),
    value: accessStats.value?.total_uv || 0,
    icon: 'fas fa-users',
    iconStyle: 'background: rgba(248, 113, 113, 0.2); color: #f87171'
  }
])
</script>

<style scoped lang="scss">
@import './StatsDashboard.scss';
</style>

