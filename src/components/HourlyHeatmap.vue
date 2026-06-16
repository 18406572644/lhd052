<template>
  <div class="heatmap-container" :class="'view-' + currentView">
    <div class="section-header">
      <span class="section-title">{{ titleText }}</span>
      <div class="header-right">
        <span v-if="currentRange === 'today' && selectedDate" class="date-indicator">
          {{ formatDateDisplay(selectedDate) }}
        </span>
        <span v-else-if="matrixTab === 'matrix'" class="section-total">{{ formatDurationShort(matrixTotal) }}</span>
        <span v-else class="section-total">{{ formatDurationShort(totalTime) }}</span>
      </div>
    </div>

    <div class="tab-switcher">
      <button
        class="tab-btn"
        :class="{ active: matrixTab === 'period' }"
        @click="matrixTab = 'period'"
      >
        时段热力
      </button>
      <button
        class="tab-btn"
        :class="{ active: matrixTab === 'matrix' }"
        @click="switchToMatrix"
      >
        周模式矩阵
      </button>
    </div>

    <div v-if="matrixTab === 'period'">
      <div class="range-selector">
        <button
          v-for="range in rangeOptions"
          :key="range.value"
          class="range-btn"
          :class="{ active: currentRange === range.value }"
          @click="handleRangeChange(range.value)"
        >
          {{ range.label }}
        </button>
      </div>

      <div v-if="currentView === 'day'" class="heatmap-grid-wrapper">
        <div class="hour-labels">
          <span v-for="h in labelHours" :key="h" class="hour-label">{{ h }}</span>
        </div>
        <div class="heatmap-grid day-grid">
          <div
            v-for="(value, hour) in dayData"
            :key="hour"
            class="heatmap-cell"
            :class="'level-' + getDayLevel(value)"
            :title="getDayCellTitle(hour, value)"
            @click="handleDayCellClick(hour)"
          ></div>
        </div>
      </div>

      <div v-else-if="currentView === 'week'" class="heatmap-week-wrapper">
        <div class="week-corner"></div>
        <div class="week-hour-labels">
          <span v-for="h in labelHours" :key="h" class="week-hour-label">{{ h }}</span>
        </div>
        <div class="week-body">
          <div class="week-day-labels">
            <span v-for="(day, idx) in weekDays" :key="idx" class="week-day-label">{{ day }}</span>
          </div>
          <div class="heatmap-week-grid">
            <div
              v-for="(dayData, dayIdx) in weekData"
              :key="dayIdx"
              class="week-row"
            >
              <div
                v-for="(value, hour) in dayData"
                :key="hour"
                class="heatmap-cell"
                :class="'level-' + getWeekLevel(value)"
                :title="getWeekCellTitle(dayIdx, hour, value)"
                @click="handleWeekCellClick(dayIdx, hour)"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="currentView === 'month'" class="heatmap-month-wrapper">
        <div class="month-weekday-labels">
          <span v-for="d in monthWeekdays" :key="d" class="month-weekday-label">{{ d }}</span>
        </div>
        <div class="heatmap-month-grid">
          <div
            v-for="(week, weekIdx) in monthWeeks"
            :key="weekIdx"
            class="month-week-row"
          >
            <div
              v-for="(day, dayIdx) in week"
              :key="day.date"
              class="heatmap-cell month-cell"
              :class="[
                'level-' + getMonthLevel(day.duration),
                { 'out-of-month': !day.inMonth, 'is-today': isToday(day.date) }
              ]"
              :title="getMonthCellTitle(day)"
              @click="handleMonthCellClick(day)"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="matrixTab === 'matrix'" class="matrix-wrapper">
      <div class="matrix-subtitle">一周各时段使用分布（历史累计）</div>
      <div class="heatmap-week-wrapper">
        <div class="week-corner"></div>
        <div class="week-hour-labels">
          <span v-for="h in labelHours" :key="h" class="week-hour-label">{{ h }}</span>
        </div>
        <div class="week-body">
          <div class="week-day-labels">
            <span v-for="(day, idx) in weekDays" :key="idx" class="week-day-label">{{ day }}</span>
          </div>
          <div class="heatmap-week-grid">
            <div
              v-for="(dayData, dayIdx) in matrixData"
              :key="dayIdx"
              class="week-row"
            >
              <div
                v-for="(value, hour) in dayData"
                :key="hour"
                class="heatmap-cell"
                :class="'level-' + getMatrixLevel(value)"
                :title="getMatrixCellTitle(dayIdx, hour, value)"
                @click="handleMatrixCellClick(dayIdx, hour)"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="heatmap-legend">
      <span class="legend-label">少</span>
      <div class="legend-cells">
        <div class="legend-cell level-0"></div>
        <div class="legend-cell level-1"></div>
        <div class="legend-cell level-2"></div>
        <div class="legend-cell level-3"></div>
        <div class="legend-cell level-4"></div>
      </div>
      <span class="legend-label">多</span>
    </div>

    <Teleport to="body">
      <div v-if="showPieModal" class="modal-overlay" @click.self="closePieModal">
        <div class="modal-content pie-modal">
          <div class="modal-header">
            <span class="modal-title">{{ pieModalTitle }}</span>
            <button class="modal-close" @click="closePieModal">×</button>
          </div>
          <div class="modal-body">
            <div v-if="pieData.length > 0" class="pie-chart-wrapper">
              <Pie :data="pieChartData" :options="pieChartOptions" />
            </div>
            <div v-else class="pie-empty">
              <div class="pie-empty-icon">📊</div>
              <div class="pie-empty-text">该时段暂无使用数据</div>
            </div>
            <div v-if="pieData.length > 0" class="pie-legend-list">
              <div
                v-for="(item, idx) in pieData"
                :key="item.process_name"
                class="pie-legend-item"
              >
                <span class="pie-legend-color" :style="{ background: pieColors[idx] }"></span>
                <span class="pie-legend-name">{{ getDisplayName(item.process_name) }}</span>
                <span class="pie-legend-time">{{ formatDurationShort(item.total_duration) }}</span>
                <span class="pie-legend-percent">{{ getPiePercent(item.total_duration) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { formatDurationShort, getAppIcon } from '../utils/appIcons'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  selectedDate: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select-date'])

const currentRange = ref('today')
const currentView = ref('day')
const dayData = ref(new Array(24).fill(0))
const weekDaysData = ref({ days: [], data: [] })
const monthData = ref({ weeks: [], data: [] })
const showPieModal = ref(false)
const pieData = ref([])
const pieModalTitle = ref('')
const matrixTab = ref('period')
const matrixData = ref(Array.from({ length: 7 }, () => new Array(24).fill(0)))
const matrixLoaded = ref(false)

const rangeOptions = [
  { value: 'today', label: '今日', view: 'day' },
  { value: 'week', label: '本周', view: 'week' },
  { value: 'month', label: '本月', view: 'month' },
  { value: 'last30', label: '最近30天', view: 'month' }
]

const labelHours = [0, 6, 12, 18, 23]
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const monthWeekdays = ['一', '二', '三', '四', '五', '六', '日']

const pieColors = ['#66fcb8', '#4de0a0', '#36b37e']

const titleText = computed(() => {
  if (matrixTab.value === 'matrix') {
    return '活跃度 · 周模式'
  }
  const range = rangeOptions.find(r => r.value === currentRange.value)
  if (currentRange.value === 'today' && props.selectedDate) {
    return '单日详情'
  }
  return range ? `活跃度 · ${range.label}` : '活跃度'
})

const weekData = computed(() => weekDaysData.value.data || [])

const monthWeeks = computed(() => monthData.value.weeks || [])

const totalTime = computed(() => {
  if (currentView.value === 'day') {
    return dayData.value.reduce((sum, v) => sum + v, 0)
  } else if (currentView.value === 'week') {
    return weekData.value.reduce((sum, day) => sum + day.reduce((s, v) => s + v, 0), 0)
  } else if (currentView.value === 'month') {
    return (monthData.value.data || []).reduce((sum, d) => sum + (d.duration || 0), 0)
  }
  return 0
})

const matrixTotal = computed(() => {
  return matrixData.value.reduce((sum, day) => sum + day.reduce((s, v) => s + v, 0), 0)
})

const maxMatrixValue = computed(() => {
  let max = 0
  matrixData.value.forEach(day => {
    day.forEach(v => { if (v > max) max = v })
  })
  return max > 0 ? max : 1
})

const pieTotal = computed(() => {
  return pieData.value.reduce((sum, i) => sum + i.total_duration, 0) || 1
})

const pieChartData = computed(() => ({
  labels: pieData.value.map(i => getDisplayName(i.process_name)),
  datasets: [{
    data: pieData.value.map(i => i.total_duration),
    backgroundColor: pieColors,
    borderWidth: 0,
    hoverOffset: 4
  }]
}))

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = context.raw
          const percent = Math.round((value / pieTotal.value) * 100)
          return `${formatDurationShort(value)} (${percent}%)`
        }
      }
    }
  }
}

const maxDayValue = computed(() => {
  const max = Math.max(...dayData.value)
  return max > 0 ? max : 1
})

const maxWeekValue = computed(() => {
  let max = 0
  weekData.value.forEach(day => {
    day.forEach(v => { if (v > max) max = v })
  })
  return max > 0 ? max : 1
})

const maxMonthValue = computed(() => {
  let max = 0
  ;(monthData.value.data || []).forEach(d => {
    if (d.duration > max) max = d.duration
  })
  return max > 0 ? max : 1
})

function getDayLevel(value) {
  if (value <= 0) return 0
  const ratio = value / maxDayValue.value
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

function getWeekLevel(value) {
  if (value <= 0) return 0
  const ratio = value / maxWeekValue.value
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

function getMonthLevel(value) {
  if (value <= 0) return 0
  const ratio = value / maxMonthValue.value
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

function getMatrixLevel(value) {
  if (value <= 0) return 0
  const ratio = value / maxMatrixValue.value
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

function getDayCellTitle(hour, value) {
  const timeStr = `${hour.toString().padStart(2, '0')}:00`
  const durationStr = formatDurationShort(value)
  return `${timeStr} - ${durationStr}`
}

function getWeekCellTitle(dayIdx, hour, value) {
  const date = weekDaysData.value.dates ? weekDaysData.value.dates[dayIdx] : weekDaysData.value.days[dayIdx]
  const weekDay = weekDays[dayIdx]
  const timeStr = `${hour.toString().padStart(2, '0')}:00`
  const durationStr = formatDurationShort(value)
  return `${date} ${weekDay} ${timeStr} - ${durationStr}`
}

function getMonthCellTitle(day) {
  const durationStr = formatDurationShort(day.duration)
  return `${day.date} - 总计 ${durationStr}`
}

function getMatrixCellTitle(dayIdx, hour, value) {
  const weekDay = weekDays[dayIdx]
  const timeStr = `${hour.toString().padStart(2, '0')}:00`
  const durationStr = formatDurationShort(value)
  return `${weekDay} ${timeStr} - 累计 ${durationStr}`
}

function getDisplayName(processName) {
  const iconInfo = getAppIcon(processName)
  if (iconInfo.label !== processName) {
    return iconInfo.label
  }
  const name = processName.replace(/\.(exe|app|lnk|bat|cmd)$/i, '')
  if (name.length > 10) {
    return name.slice(0, 8) + '...'
  }
  return name
}

function getPiePercent(duration) {
  return Math.round((duration / pieTotal.value) * 100)
}

function isToday(dateStr) {
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr)
  const today = new Date().toISOString().split('T')[0]
  if (dateStr === today) return '今日'
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}月${day}日`
}

async function handleRangeChange(range) {
  const option = rangeOptions.find(r => r.value === range)
  currentRange.value = range
  currentView.value = option.view
  emit('select-date', '')
  await loadHeatmapData()
}

async function loadHeatmapData() {
  try {
    const data = await window.electronAPI.getDateRangeHeatmap(currentRange.value)
    if (data.type === 'day') {
      dayData.value = data.data
    } else if (data.type === 'week') {
      weekDaysData.value = data
    } else if (data.type === 'month') {
      monthData.value = data
    }
  } catch (e) {
    console.error('加载热力图数据失败:', e)
  }
}

async function loadDailyData(date) {
  try {
    dayData.value = await window.electronAPI.getDailyHeatmapByDate(date)
  } catch (e) {
    console.error('加载单日数据失败:', e)
  }
}

async function handleDayCellClick(hour) {
  const date = props.selectedDate || new Date().toISOString().split('T')[0]
  await openPieModal(date, hour)
}

async function handleWeekCellClick(dayIdx, hour) {
  const date = weekDaysData.value.dates ? weekDaysData.value.dates[dayIdx] : weekDaysData.value.days[dayIdx]
  await openPieModal(date, hour)
}

async function handleMatrixCellClick(dayIdx, hour) {
  await openMatrixPieModal(dayIdx, hour)
}

async function openMatrixPieModal(dayIdx, hour) {
  try {
    const data = await window.electronAPI.getWeeklyMatrixHourApps(dayIdx, hour)
    pieData.value = data
    pieModalTitle.value = `${weekDays[dayIdx]} ${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00 · 历史累计 Top 3`
    showPieModal.value = true
  } catch (e) {
    console.error('加载矩阵时段应用数据失败:', e)
  }
}

async function loadMatrixData() {
  try {
    const data = await window.electronAPI.getWeeklyHeatmapMatrix()
    if (data && data.data) {
      matrixData.value = data.data
    }
    matrixLoaded.value = true
  } catch (e) {
    console.error('加载周模式矩阵数据失败:', e)
  }
}

function switchToMatrix() {
  matrixTab.value = 'matrix'
  if (!matrixLoaded.value) {
    loadMatrixData()
  }
}

async function openPieModal(date, hour) {
  try {
    const data = await window.electronAPI.getHourlyAppUsage(date, hour)
    pieData.value = data
    pieModalTitle.value = `${date} ${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00 使用分布`
    showPieModal.value = true
  } catch (e) {
    console.error('加载时段应用数据失败:', e)
  }
}

function closePieModal() {
  showPieModal.value = false
  pieData.value = []
}

function handleMonthCellClick(day) {
  if (!day.inMonth) return
  emit('select-date', day.date)
}

watch(() => props.selectedDate, async (newDate) => {
  if (newDate) {
    currentRange.value = 'today'
    currentView.value = 'day'
    await loadDailyData(newDate)
  } else {
    await loadHeatmapData()
  }
})

onMounted(async () => {
  if (props.selectedDate) {
    await loadDailyData(props.selectedDate)
  } else {
    await loadHeatmapData()
  }
})
</script>

<style scoped>
.heatmap-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}

.heatmap-container.view-day {
  min-height: 120px;
}

.heatmap-container.view-week {
  min-height: 200px;
}

.heatmap-container.view-month {
  min-height: 180px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-total {
  font-size: 10px;
  color: var(--accent-color);
  font-weight: 600;
  background: rgba(102, 252, 184, 0.1);
  padding: 2px 6px;
  border-radius: 8px;
}

.date-indicator {
  font-size: 10px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 8px;
}

.tab-switcher {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  padding: 3px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.tab-switcher .tab-btn {
  flex: 1;
  padding: 6px 8px;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-switcher .tab-btn:hover {
  color: var(--text-secondary);
}

.tab-switcher .tab-btn.active {
  color: var(--text-primary);
  background: var(--bg-secondary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.range-selector {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  padding: 3px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.range-btn {
  flex: 1;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.range-btn:hover {
  color: var(--text-secondary);
}

.range-btn.active {
  color: var(--text-primary);
  background: var(--bg-secondary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.heatmap-grid-wrapper {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.hour-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 20px;
  flex-shrink: 0;
}

.hour-label {
  font-size: 9px;
  color: var(--text-muted);
  line-height: 1;
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 3px;
  flex: 1;
}

.heatmap-week-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.week-corner {
  width: 28px;
  height: 16px;
  flex-shrink: 0;
}

.week-hour-labels {
  display: grid;
  grid-template-columns: 28px repeat(24, 1fr);
  gap: 3px;
  margin-left: 28px;
  padding-left: 3px;
}

.week-hour-label {
  font-size: 8px;
  color: var(--text-muted);
  text-align: center;
}

.week-body {
  display: flex;
  gap: 6px;
}

.week-day-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  width: 28px;
  flex-shrink: 0;
  gap: 3px;
}

.week-day-label {
  font-size: 9px;
  color: var(--text-muted);
  text-align: right;
  padding-right: 2px;
  line-height: 1;
  height: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.heatmap-week-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.week-row {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 3px;
}

.heatmap-month-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.month-weekday-labels {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
  padding: 0 1px;
}

.month-weekday-label {
  font-size: 9px;
  color: var(--text-muted);
  text-align: center;
}

.heatmap-month-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.month-week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.heatmap-cell {
  aspect-ratio: 1;
  border-radius: 3px;
  min-height: 10px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.heatmap-cell:hover {
  transform: scale(1.2);
  z-index: 1;
  box-shadow: 0 0 0 1px var(--accent-color);
}

.month-cell.out-of-month {
  opacity: 0.2;
  cursor: default;
}

.month-cell.out-of-month:hover {
  transform: none;
  box-shadow: none;
}

.month-cell.is-today {
  outline: 1px solid var(--accent-color);
  outline-offset: 1px;
}

.level-0 {
  background: var(--heatmap-level-0);
}

.level-1 {
  background: var(--heatmap-level-1);
}

.level-2 {
  background: var(--heatmap-level-2);
}

.level-3 {
  background: var(--heatmap-level-3);
}

.level-4 {
  background: var(--heatmap-level-4);
}

.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.legend-label {
  font-size: 9px;
  color: var(--text-muted);
}

.legend-cells {
  display: flex;
  gap: 3px;
}

.legend-cell {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  min-width: 280px;
  max-width: 90vw;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.pie-modal {
  width: 320px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 14px;
}

.pie-chart-wrapper {
  width: 160px;
  height: 160px;
  margin: 0 auto 14px;
}

.pie-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0;
  gap: 8px;
}

.pie-empty-icon {
  font-size: 32px;
  opacity: 0.5;
}

.pie-empty-text {
  font-size: 12px;
  color: var(--text-muted);
}

.pie-legend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pie-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.pie-legend-color {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.pie-legend-name {
  flex: 1;
  color: var(--text-primary);
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pie-legend-time {
  color: var(--accent-color);
  font-weight: 600;
  flex-shrink: 0;
}

.pie-legend-percent {
  color: var(--text-muted);
  min-width: 30px;
  text-align: right;
  flex-shrink: 0;
}

.matrix-wrapper {
  margin-bottom: 8px;
}

.matrix-subtitle {
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 8px;
  text-align: center;
}
</style>
