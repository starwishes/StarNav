<template>
  <div class="chart-card">
    <h3>{{ title }}</h3>
    <div v-if="chartData.hasData" class="chart trend-chart">
      <div class="trend-legend">
        <div class="legend-chip">
          <span class="legend-dot is-pv"></span>
          <span>PV</span>
        </div>
        <div class="legend-chip">
          <span class="legend-dot is-uv"></span>
          <span>UV</span>
        </div>
      </div>
      <svg
        class="chart-svg"
        :viewBox="`0 0 ${chartData.width} ${chartData.height}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(96, 165, 250, 0.42)" />
            <stop offset="100%" stop-color="rgba(96, 165, 250, 0)" />
          </linearGradient>
          <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(52, 211, 153, 0.32)" />
            <stop offset="100%" stop-color="rgba(52, 211, 153, 0)" />
          </linearGradient>
        </defs>

        <g v-for="tick in chartData.yTicks" :key="tick.value">
          <line
            :x1="chartData.padding.left"
            :x2="chartData.width - chartData.padding.right"
            :y1="tick.y"
            :y2="tick.y"
            class="chart-grid-line"
          />
          <text
            :x="chartData.padding.left - 10"
            :y="tick.y + 4"
            text-anchor="end"
            class="chart-axis-text"
          >
            {{ tick.value }}
          </text>
        </g>

        <path :d="chartData.pvAreaPath" fill="url(#pvGradient)" />
        <path :d="chartData.uvAreaPath" fill="url(#uvGradient)" />
        <path :d="chartData.pvLinePath" class="chart-line chart-line-pv" />
        <path :d="chartData.uvLinePath" class="chart-line chart-line-uv" />

        <g v-for="point in chartData.points" :key="point.label">
          <circle :cx="point.x" :cy="point.pvY" r="4.2" class="chart-point chart-point-pv" />
          <circle :cx="point.x" :cy="point.uvY" r="4.2" class="chart-point chart-point-uv" />
          <text
            :x="point.x"
            :y="chartData.height - 10"
            text-anchor="middle"
            class="chart-axis-text"
          >
            {{ point.label }}
          </text>
        </g>
      </svg>
    </div>
    <div v-else class="chart-empty">{{ emptyLabel }}</div>
  </div>
</template>

<script setup lang="ts">
import type { TrendChartData } from '@/composables/admin/useStatsDashboard'

defineProps<{
  title: string
  emptyLabel: string
  chartData: TrendChartData
}>()
</script>

<style scoped lang="scss">
@import './TrendChartCard.scss';
</style>

