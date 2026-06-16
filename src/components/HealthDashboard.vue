<template>
  <div class="health-dashboard">
    <div class="sub-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="sub-tab"
        :class="{ active: activeSubTab === tab.key }"
        @click="activeSubTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <div class="dash-content" v-if="activeSubTab === 'today'">
      <EyeStrainCard :eyeStrain="healthData.eyeStrain" />
      <RestBehaviorCard :restBehavior="healthData.restBehavior" />
      <SedentaryCard :sedentary="healthData.sedentary" />
      <BlueLightCard :blueLight="healthData.blueLight" />
      <button class="metrics-btn" @click="activeSubTab = 'metrics'">
        记录身体指标 →
      </button>
    </div>

    <div class="dash-content" v-if="activeSubTab === 'metrics'">
      <BodyMetricsInput v-if="metricsComponent" />
      <HealthScatterChart v-if="scatterComponent" />
      <div class="placeholder-card" v-if="!metricsComponent">
        <span class="placeholder-icon">📋</span>
        <span class="placeholder-text">身体指标录入组件加载中…</span>
      </div>
    </div>

    <div class="dash-content" v-if="activeSubTab === 'weekly'">
      <WeeklyHealthReport v-if="weeklyComponent" />
      <div class="placeholder-card" v-if="!weeklyComponent">
        <span class="placeholder-icon">📅</span>
        <span class="placeholder-text">周报组件加载中…</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import EyeStrainCard from './EyeStrainCard.vue'
import RestBehaviorCard from './RestBehaviorCard.vue'
import SedentaryCard from './SedentaryCard.vue'
import BlueLightCard from './BlueLightCard.vue'

const BodyMetricsInput = defineAsyncComponent(() =>
  import('./BodyMetricsInput.vue').catch(() => null)
)
const HealthScatterChart = defineAsyncComponent(() =>
  import('./HealthScatterChart.vue').catch(() => null)
)
const WeeklyHealthReport = defineAsyncComponent(() =>
  import('./WeeklyHealthReport.vue').catch(() => null)
)

const metricsComponent = ref(true)
const scatterComponent = ref(true)
const weeklyComponent = ref(true)

const tabs = [
  { key: 'today', label: '今日' },
  { key: 'metrics', label: '指标' },
  { key: 'weekly', label: '周报' }
]

const activeSubTab = ref('today')

const healthData = reactive({
  eyeStrain: {},
  restBehavior: {},
  sedentary: {},
  blueLight: {}
})

let refreshTimer = null

async function loadHealthData() {
  try {
    const data = await window.electronAPI.getHealthDashboard()
    if (data) {
      Object.assign(healthData, data)
    }
  } catch (e) {
    console.error('加载健康数据失败:', e)
  }
}

onMounted(() => {
  loadHealthData()
  refreshTimer = setInterval(loadHealthData, 10000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.health-dashboard {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}

.sub-tabs {
  display: flex;
  gap: 2px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 2px;
  flex-shrink: 0;
}

.sub-tab {
  flex: 1;
  padding: 5px 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.sub-tab.active {
  background: var(--accent-color);
  color: #0f1923;
  font-weight: 600;
}

.sub-tab:hover:not(.active) {
  color: var(--text-secondary);
}

.dash-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metrics-btn {
  width: 100%;
  padding: 8px 0;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--accent-color);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.metrics-btn:hover {
  background: rgba(102, 252, 184, 0.08);
}

.placeholder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 12px;
  background: var(--bg-secondary);
  border-radius: 10px;
  border: 1px dashed var(--border-color);
}

.placeholder-icon {
  font-size: 24px;
}

.placeholder-text {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
