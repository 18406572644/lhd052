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

.tab-bar {
  display: flex;
  padding: 0 10px;
  gap: 4px;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(180deg, rgba(102, 252, 184, 0.03) 0%, transparent 100%);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
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
  font-size: 12px;
  line-height: 1;
}

.tab-label {
  line-height: 1;
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

.health-content {
  padding: 10px 10px 12px;
  gap: 10px;
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
