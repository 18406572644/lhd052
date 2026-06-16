<template>
  <div class="app-container">
    <div class="app-card">
      <TitleBar @minimize="handleMinimize" @close="handleClose" />
      <div class="app-content">
        <TotalTimeCard :totalTime="totalTime" />
        <DailyInsights :insights="dailyInsights" class="insights-section" />
        <AppRankingChart :appUsage="appUsage" class="chart-section" />
        <HourlyHeatmap :heatmapData="heatmapData" class="heatmap-section" />
        <FocusModePanel
          :rules="focusRules"
          @save="handleSaveRule"
          @delete="handleDeleteRule"
        />
      </div>
    </div>
    <FocusAlertModal
      v-if="showFocusAlert"
      :alertData="focusAlertData"
      @close="showFocusAlert = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import TotalTimeCard from './components/TotalTimeCard.vue'
import DailyInsights from './components/DailyInsights.vue'
import AppRankingChart from './components/AppRankingChart.vue'
import HourlyHeatmap from './components/HourlyHeatmap.vue'
import FocusModePanel from './components/FocusModePanel.vue'
import FocusAlertModal from './components/FocusAlertModal.vue'

const totalTime = ref(0)
const appUsage = ref([])
const heatmapData = ref(new Array(24).fill(0))
const focusRules = ref([])
const dailyInsights = ref([])
const showFocusAlert = ref(false)
const focusAlertData = ref(null)
let refreshInterval = null

async function loadAllData() {
  try {
    totalTime.value = await window.electronAPI.getTodayTotalTime()
    appUsage.value = await window.electronAPI.getTodayAppUsage()
    heatmapData.value = await window.electronAPI.getHourlyHeatmap()
    focusRules.value = await window.electronAPI.getFocusRules()
    dailyInsights.value = await window.electronAPI.getDailyInsights()
  } catch (e) {
    console.error('加载数据失败:', e)
  }
}

async function handleSaveRule(rule) {
  await window.electronAPI.saveFocusRule(rule)
  focusRules.value = await window.electronAPI.getFocusRules()
}

async function handleDeleteRule(id) {
  await window.electronAPI.deleteFocusRule(id)
  focusRules.value = await window.electronAPI.getFocusRules()
}

function handleMinimize() {
  window.electronAPI.minimizeWindow()
}

function handleClose() {
  window.electronAPI.closeWindow()
}

function handleUsageUpdate() {
  loadAllData()
}

function handleFocusAlert(data) {
  focusAlertData.value = data
  showFocusAlert.value = true
}

onMounted(() => {
  loadAllData()
  window.electronAPI.onUsageUpdated(handleUsageUpdate)
  window.electronAPI.onFocusAlert(handleFocusAlert)
  refreshInterval = setInterval(loadAllData, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: transparent;
}

.app-card {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 18px;
  border: 1px solid var(--border-color);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chart-section {
  min-height: 0;
}

.heatmap-section {
  flex-shrink: 0;
}

.insights-section {
  flex-shrink: 0;
}
</style>
