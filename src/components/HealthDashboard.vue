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
      <RestReminderSettings />
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
import RestReminderSettings from './RestReminderSettings.vue'

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
  gap: 10px;
  width: 100%;
  height: auto;
  min-height: 100%;
}

.sub-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 3px;
  flex-shrink: 0;
  max-width: 360px;
  width: 100%;
}

.sub-tab {
  flex: 1;
  padding: 6px 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.sub-tab.active {
  background: var(--accent-color);
  color: #0f1923;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(102, 252, 184, 0.2);
}

.sub-tab:hover:not(.active) {
  color: var(--text-secondary);
}

.dash-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding-bottom: 8px;
}

.metrics-btn {
  width: 100%;
  padding: 10px 0;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--accent-color);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.metrics-btn:hover {
  background: rgba(102, 252, 184, 0.08);
  border-color: var(--accent-color);
}

.placeholder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px dashed var(--border-color);
}

.placeholder-icon {
  font-size: 28px;
}

.placeholder-text {
  font-size: 12px;
  color: var(--text-muted);
}

@media (min-width: 600px) {
  .dash-content {
    gap: 16px;
  }
}

@media (min-width: 800px) {
  .dash-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    align-content: start;
  }
  .dash-content > * {
    width: 100%;
  }
  .metrics-btn {
    grid-column: 1 / -1;
  }
}

@media (min-width: 1100px) {
  .dash-content {
    grid-template-columns: 1fr 1fr 1fr;
  }
}
</style>
