<template>
  <div class="stats-dashboard">
    <!-- 1. 访问统计核心指标 (PV/UV) -->
    <div class="section-title">
      <i class="fas fa-chart-line"></i> {{ t('stats.accessOverview') }}
    </div>
    <div class="stats-cards">
      <div class="stat-card glass-card">
        <div class="stat-icon">
          <i class="fas fa-eye"></i>
        </div>
        <div class="stat-info">
          <div class="stat-label">{{ t('stats.todayPV') }}</div>
          <div class="stat-value">{{ accessStats.today_pv || 0 }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background: rgba(52, 211, 153, 0.2); color: #34d399;">
          <i class="fas fa-user"></i>
        </div>
        <div class="stat-info">
          <div class="stat-label">{{ t('stats.todayUV') }}</div>
          <div class="stat-value">{{ accessStats.today_uv || 0 }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background: rgba(96, 165, 250, 0.2); color: #60a5fa;">
          <i class="fas fa-globe"></i>
        </div>
        <div class="stat-info">
          <div class="stat-label">{{ t('stats.totalPV') }}</div>
          <div class="stat-value">{{ accessStats.total_pv || 0 }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background: rgba(248, 113, 113, 0.2); color: #f87171;">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-info">
          <div class="stat-label">{{ t('stats.totalUV') }}</div>
          <div class="stat-value">{{ accessStats.total_uv || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- 2. 访问趋势与分布图表 -->
    <div class="charts-container" style="margin-top: 20px;">
      <!-- 访问趋势图 -->
      <div class="chart-card glass-card span-2">
        <h3>{{ t('stats.visitTrend') }}</h3>
        <div ref="trendChart" class="chart"></div>
      </div>

      <!-- 访客分布 -->
      <div class="chart-card glass-card">
        <h3>{{ t('stats.osDistribution') }}</h3>
        <div ref="osChart" class="chart"></div>
      </div>
      <div class="chart-card glass-card">
        <h3>{{ t('stats.browserDistribution') }}</h3>
        <div ref="browserChart" class="chart"></div>
      </div>
    </div>

    <!-- 3. 内容统计 (原有) -->
    <div class="section-title" style="margin-top: 30px;">
        <i class="fas fa-database"></i> {{ t('stats.contentOverview') }}
    </div>
    <el-row :gutter="16">
      <el-col :xs="24" :sm="8" :md="6">
        <el-card shadow="never" class="stat-card-simple">
          <div class="stat-value">{{ totalBookmarks }}</div>
          <div class="stat-label">{{ t('stats.totalBookmarks') }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8" :md="6">
        <el-card shadow="never" class="stat-card-simple">
          <div class="stat-value">{{ totalCategories }}</div>
          <div class="stat-label">{{ t('stats.totalCategories') }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8" :md="6">
         <!-- 总点击(书签点击) -->
        <el-card shadow="never" class="stat-card-simple">
          <div class="stat-value">{{ totalClicks }}</div>
          <div class="stat-label">{{ t('stats.totalClicks') }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8" :md="6" v-if="totalUsers > 0">
        <el-card shadow="never" class="stat-card-simple">
          <div class="stat-value">{{ totalUsers }}</div>
          <div class="stat-label">{{ t('stats.totalUsers') }}</div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 4. 热门书签排行 (原有) -->
    <el-card shadow="never" class="glass-card" style="margin-top: 20px;">
      <template #header>
        <span>🔥 {{ t('stats.topBookmarks') }}</span>
      </template>
      
      <el-table :data="topBookmarks" stripe>
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="name" :label="t('stats.name')" />
        <el-table-column prop="clickCount" :label="t('stats.clickCount')" width="100" sortable>
          <template #default="{ row }">
            <el-tag type="primary">{{ row.clickCount || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="categoryName" :label="t('stats.category')" width="120" />
        <el-table-column prop="lastVisited" :label="t('stats.lastVisited')" width="180">
          <template #default="{ row }">
            {{ row.lastVisited ? formatTime(row.lastVisited) : '-' }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useAdminStore } from '@/store/admin';
import { useI18n } from 'vue-i18n';
import * as echarts from 'echarts';
import { getStats } from '@/api/stats';

const { t } = useI18n();
const adminStore = useAdminStore();

// --- Access Stats Data ---
const accessStats = ref({});
const trendChart = ref(null);
const osChart = ref(null);
const browserChart = ref(null);
let trendChartInst = null;
let osChartInst = null;
let browserChartInst = null;

// --- Content Stats Data ---
const items = ref([]);
const categories = ref([]);
const totalUsers = ref(0);

// --- Computed ---
const totalClicks = computed(() => 
  items.value.reduce((sum, item) => sum + (item.clickCount || 0), 0)
);
const totalBookmarks = computed(() => items.value.length);
const totalCategories = computed(() => categories.value.length);

const topBookmarks = computed(() => {
  const catMap = new Map(categories.value.map(c => [c.id, c.name]));
  return [...items.value]
    .sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))
    .slice(0, 10)
    .map(item => ({
      ...item,
      categoryName: catMap.get(item.categoryId) || '未分类'
    }));
});

// --- Formatting ---
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString('zh-CN');
};

// --- ECharts Logic ---
const initCharts = () => {
  if (trendChart.value) trendChartInst = echarts.init(trendChart.value);
  if (osChart.value) osChartInst = echarts.init(osChart.value);
  if (browserChart.value) browserChartInst = echarts.init(browserChart.value);
};

const updateCharts = () => {
  if (!accessStats.value.trend) return;

  // Trend Chart
  const dates = accessStats.value.trend.map(item => item.date.slice(5));
  trendChartInst?.setOption({
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#ccc' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: dates, axisLabel: { color: '#aaa' } },
    yAxis: { type: 'value', axisLabel: { color: '#aaa' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } },
    series: [
      {
        name: 'PV', type: 'line', smooth: true, data: accessStats.value.trend.map(item => item.pv),
        itemStyle: { color: '#60a5fa' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(96, 165, 250, 0.5)' }, { offset: 1, color: 'rgba(96, 165, 250, 0.0)' }]) }
      },
      {
        name: 'UV', type: 'line', smooth: true, data: accessStats.value.trend.map(item => item.uv),
        itemStyle: { color: '#34d399' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(52, 211, 153, 0.5)' }, { offset: 1, color: 'rgba(52, 211, 153, 0.0)' }]) }
      }
    ]
  });

  // OS Chart
  osChartInst?.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%', textStyle: { color: '#ccc' } },
    series: [{
      name: 'OS', type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#1e1e1e', borderWidth: 2 },
      label: { show: false },
      data: accessStats.value.distribution.os
    }]
  });

  // Browser Chart
  browserChartInst?.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%', textStyle: { color: '#ccc' } },
    series: [{
      name: 'Browser', type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#1e1e1e', borderWidth: 2 },
      label: { show: false },
      data: accessStats.value.distribution.browser
    }]
  });
};

const handleResize = () => {
  trendChartInst?.resize();
  osChartInst?.resize();
  browserChartInst?.resize();
};

const fetchData = async () => {
  try {
    // 1. Fetch Content Stats (Local Store)
    // 1. Fetch Content Stats (Local Store)
    const data = await adminStore.getFileContent();
    // API returns { success: true, data: { categories: [], items: [] } }
    const content = data?.data || data?.content; 
    if (content) {
      items.value = content.items || [];
      categories.value = content.categories || [];
    }
    if (adminStore.user?.level === 3) {
       const u = await adminStore.fetchUsers();
       totalUsers.value = u.length;
    }

    // 2. Fetch Access Stats (Backend API)
    const res = await getStats();
    if (res.success || res.data) {
       accessStats.value = res.data || res;
       updateCharts();
    }
  } catch (err) {
    console.error('获取统计数据失败', err);
  }
};

onMounted(() => {
  nextTick(() => {
    initCharts();
    fetchData();
    window.addEventListener('resize', handleResize);
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  trendChartInst?.dispose();
  osChartInst?.dispose();
  browserChartInst?.dispose();
});
</script>

<style scoped>
.stats-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Glass Card Styles */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  gap: 15px;
  /* Use explicit background for contrast or variable if provided */
  background: var(--el-bg-color-overlay); 
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  box-shadow: var(--el-box-shadow-light);
}

.glass-card {
  /* Common style for cards */
  background: var(--el-bg-color-overlay);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  box-shadow: var(--el-box-shadow-light);
}

.stat-card-simple {
  text-align: center;
  padding: 20px 0;
  /* background: rgba(255, 255, 255, 0.05); */
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  color: var(--el-text-color-primary);
}
.stat-card-simple .stat-value {
    font-size: 32px;
    font-weight: 700;
    color: var(--el-color-primary);
}
.stat-card-simple .stat-label {
    font-size: 14px;
    color: var(--el-text-color-regular);
    margin-top: 8px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--el-text-color-primary);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.span-2 {
  grid-column: span 2;
}

.chart-card {
  padding: 20px;
  min-height: 350px;
  display: flex;
  flex-direction: column;
}

.chart-card h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.chart {
  flex: 1;
  width: 100%;
  min-height: 250px;
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
  .span-2 {
    grid-column: span 1;
  }
}
</style>
