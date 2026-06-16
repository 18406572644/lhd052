<template>
  <div class="app-container">
    <div class="app-card">
      <TitleBar @minimize="handleMinimize" @close="handleClose" />
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'overview' }"
          @click="activeTab = 'overview'"
        >
          <span class="tab-icon">📊</span>
          <span class="tab-label">概览</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'health' }"
          @click="activeTab = 'health'"
        >
          <span class="tab-icon">💚</span>
          <span class="tab-label">健康</span>
        </button>
      </div>
      <div class="app-content" v-if="activeTab === 'overview'">
        <TotalTimeCard :totalTime="totalTime" />
        <DailyInsights :insights="dailyInsights" class="insights-section" />
        <AppRankingChart :appUsage="appUsage" class="chart-section" />
        <HourlyHeatmap
          :selectedDate="selectedDate"
          @select-date="handleSelectDate"
          class="heatmap-section"
        />
        <FocusModePanel
          :rules="focusRules"
          @save="handleSaveRule"
          @delete="handleDeleteRule"
        />
      </div>
      <div class="app-content health-content" v-if="activeTab === 'health'">
        <HealthDashboard />
      </div>
    </div>
    <FocusAlertModal
      v-if="showFocusAlert"
      :alertData="focusAlertData"
      @close="showFocusAlert = false"
    />
    <RestReminderModal
      v-if="showRestReminder"
      :reminderData="restReminderData"
      @close="handleRestDismiss"
      @accept="handleRestAccept"
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
import HealthDashboard from './components/HealthDashboard.vue'
import RestReminderModal from './components/RestReminderModal.vue'

const activeTab = ref('overview')
const totalTime = ref(0)
const appUsage = ref([])
const heatmapData = ref(new Array(24).fill(0))
const focusRules = ref([])
const dailyInsights = ref([])
const showFocusAlert = ref(false)
const focusAlertData = ref(null)
const selectedDate = ref('')
const showRestReminder = ref(false)
const restReminderData = ref(null)
let refreshInterval = null

async function loadAllData() {
  try {
    if (selectedDate.value) {
      totalTime.value = await getDateTotalTime(selectedDate.value)
      appUsage.value = await getDateAppUsage(selectedDate.value)
      heatmapData.value = await window.electronAPI.getDailyHeatmapByDate(selectedDate.value)
    } else {
      totalTime.value = await window.electronAPI.getTodayTotalTime()
      appUsage.value = await window.electronAPI.getTodayAppUsage()
      heatmapData.value = await window.electronAPI.getHourlyHeatmap()
    }
    focusRules.value = await window.electronAPI.getFocusRules()
    dailyInsights.value = await window.electronAPI.getDailyInsights()
  } catch (e) {
    console.error('加载数据失败:', e)
  }
}

async function getDateTotalTime(date) {
  try {
    const data = await window.electronAPI.getDailyHeatmapByDate(date)
    return data.reduce((sum, v) => sum + v, 0)
  } catch (e) {
    console.error('获取日期总时长失败:', e)
    return 0
  }
}

async function getDateAppUsage(date) {
  try {
    return await window.electronAPI.getDateAppUsage(date)
  } catch (e) {
    console.error('获取日期应用使用失败:', e)
    return []
  }
}

function handleSelectDate(date) {
  selectedDate.value = date
  loadAllData()
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

function handleRestReminder(data) {
  restReminderData.value = data
  showRestReminder.value = true
}

function handleRestDismiss() {
  if (restReminderData.value) {
    window.electronAPI.dismissRestReminder(restReminderData.value.id, false)
  }
  showRestReminder.value = false
  restReminderData.value = null
}

function handleRestAccept() {
  if (restReminderData.value) {
    window.electronAPI.dismissRestReminder(restReminderData.value.id, true)
  }
  showRestReminder.value = false
  restReminderData.value = null
}

onMounted(() => {
  loadAllData()
  window.electronAPI.onUsageUpdated(handleUsageUpdate)
  window.electronAPI.onFocusAlert(handleFocusAlert)
  window.electronAPI.onRestReminder(handleRestReminder)
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
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
  background: transparent;
  box-sizing: border-box;
}

.app-card {
  width: 100%;
  min-height: 100vh;
  height: auto;
  background: var(--bg-primary);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 0;
  border: none;
  box-shadow: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-bar {
  display: flex;
  padding: 0 16px;
  gap: 6px;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(180deg, rgba(102, 252, 184, 0.03) 0%, transparent 100%);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  max-width: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.tab-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: var(--accent-color);
  border-radius: 1px;
  transition: width 0.25s ease;
}

.tab-btn.active {
  color: var(--text-primary);
}

.tab-btn.active::after {
  width: 60%;
}

.tab-btn:hover:not(.active) {
  color: var(--text-secondary);
}

.tab-icon {
  font-size: 14px;
  line-height: 1;
}

.tab-label {
  line-height: 1;
}

.app-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 100%;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.health-content {
  padding: 16px 18px 24px;
  gap: 14px;
}

.chart-section {
  min-height: 220px;
  width: 100%;
}

.heatmap-section {
  flex-shrink: 0;
  width: 100%;
}

.insights-section {
  flex-shrink: 0;
  width: 100%;
}

@media (min-width: 600px) {
  .app-content {
    padding: 28px 40px 40px;
  }
  .health-content {
    padding: 24px 32px 40px;
  }
  .tab-bar {
    padding: 0 28px;
  }
}

@media (min-width: 900px) {
  .app-content {
    padding: 32px 48px 48px;
    max-width: 1100px;
  }
  .health-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .health-content > * {
    width: 100%;
  }
  .tab-bar {
    padding: 0 44px;
  }
}

@media (min-width: 1200px) {
  .app-content {
    max-width: 1400px;
  }
}
</style>
