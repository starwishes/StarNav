<template>
  <div class="chart-card">
    <h3>{{ title }}</h3>
    <div v-if="distribution.hasData" class="chart distribution-chart">
      <div class="donut-wrap">
        <svg class="donut-svg" viewBox="0 0 220 220" aria-hidden="true">
          <circle class="donut-track" cx="110" cy="110" r="74" />
          <circle
            v-if="distribution.segments.length === 1"
            cx="110"
            cy="110"
            r="74"
            class="donut-arc"
            :stroke="distribution.segments[0].color"
          />
          <path
            v-for="segment in distribution.segments"
            v-else
            :key="segment.name"
            :d="segment.path"
            class="donut-arc"
            :stroke="segment.color"
          />
        </svg>
        <div class="donut-center">
          <div class="donut-total">{{ distribution.total }}</div>
          <div class="donut-label">{{ totalLabel }}</div>
        </div>
      </div>
      <div class="distribution-legend">
        <div v-for="segment in distribution.segments" :key="segment.name" class="distribution-row">
          <div class="distribution-name">
            <span class="distribution-swatch" :style="{ backgroundColor: segment.color }"></span>
            <span>{{ segment.name }}</span>
          </div>
          <div class="distribution-metrics">
            <span>{{ segment.value }}</span>
            <span>{{ formatPercent(segment.percent) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="chart-empty">{{ emptyLabel }}</div>
  </div>
</template>

<script setup lang="ts">
import type { DistributionData } from '@/composables/admin/useStatsDashboard'

defineProps<{
  title: string
  totalLabel: string
  emptyLabel: string
  distribution: DistributionData
}>()

const formatPercent = (percent: number) =>
  `${percent >= 10 ? percent.toFixed(0) : percent.toFixed(1)}%`
</script>

<style scoped lang="scss">
@use './DistributionChartCard.scss';
</style>

