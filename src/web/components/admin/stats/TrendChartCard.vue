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
.chart-card {
  --stats-chart-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
  --stats-chart-border: rgba(255, 255, 255, 0.6);
  --stats-chart-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  --stats-chart-empty-bg: rgba(255, 255, 255, 0.4);
  --stats-chart-chip-bg: rgba(255, 255, 255, 0.72);
  --stats-chart-chip-border: rgba(148, 163, 184, 0.18);
  color: var(--ui-text-primary, #0f172a);
  min-height: 380px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  background: var(--stats-chart-bg);
  border: 1px solid var(--stats-chart-border);
  box-shadow: var(--stats-chart-shadow);
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

:global(:root[theme-mode='dark'] .chart-card) {
  --stats-chart-bg: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.82));
  --stats-chart-border: rgba(148, 163, 184, 0.18);
  --stats-chart-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
  --stats-chart-empty-bg: rgba(15, 23, 42, 0.5);
  --stats-chart-chip-bg: rgba(15, 23, 42, 0.78);
  --stats-chart-chip-border: rgba(148, 163, 184, 0.18);
}

.chart-card h3 {
  margin: 0 0 18px;
  font-size: 17px;
  font-weight: 700;
  color: var(--gray-800);
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    width: 4px;
    height: 20px;
    background: linear-gradient(180deg, var(--ui-theme), rgba(var(--ui-theme-rgb), 0.6));
    border-radius: 2px;
  }
}

.chart {
  flex: 1;
  width: 100%;
  min-height: 280px;
}

.chart-empty {
  flex: 1;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-500);
  font-size: 14px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 18px;
  background: var(--stats-chart-empty-bg);
}

.chart-svg {
  width: 100%;
  height: 100%;
  min-height: 280px;
}

.trend-chart {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trend-legend {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--stats-chart-chip-bg);
  border: 1px solid var(--stats-chart-chip-border);
  color: var(--gray-700);
  font-size: 12px;
  font-weight: 700;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-dot.is-pv {
  background: #60a5fa;
}

.legend-dot.is-uv {
  background: #34d399;
}

.chart-grid-line {
  stroke: rgba(148, 163, 184, 0.22);
  stroke-width: 1;
}

.chart-axis-text {
  fill: #7c8798;
  font-size: 11px;
  font-weight: 600;
}

.chart-line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-line-pv {
  stroke: #60a5fa;
}

.chart-line-uv {
  stroke: #34d399;
}

.chart-point {
  stroke: rgba(255, 255, 255, 0.92);
  stroke-width: 2;
}

.chart-point-pv {
  fill: #60a5fa;
}

.chart-point-uv {
  fill: #34d399;
}
</style>

