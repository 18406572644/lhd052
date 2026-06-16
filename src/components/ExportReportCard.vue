<template>
  <div ref="reportCardRef" class="export-report-card" :class="{ 'is-hidden': isHidden }">
    <div class="card-header">
      <div class="card-title">屏幕使用时间报告</div>
      <div class="card-date-range">{{ dateRangeText }}</div>
    </div>
    
    <div class="card-summary">
      <div class="summary-item total-time">
        <div class="summary-label">总使用时长</div>
        <div class="summary-value">
          <span class="value-hours">{{ totalHours }}</span>
          <span class="value-unit">小时</span>
          <span class="value-minutes">{{ totalMinutes }}</span>
          <span class="value-unit">分钟</span>
        </div>
      </div>
      <div class="summary-item days-tracked">
        <div class="summary-label">统计天数</div>
        <div class="summary-value">
          <span class="value-number">{{ daysTracked }}</span>
          <span class="value-unit">天</span>
        </div>
      </div>
    </div>

    <div class="card-content">
      <div class="content-section top-apps">
        <div class="section-title">Top 5 应用</div>
        <div class="app-list">
          <div
            v-for="(app, index) in topApps"
            :key="app.process_name"
            class="app-item"
          >
            <div class="app-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
            <div class="app-name">{{ getDisplayName(app.process_name) }}</div>
            <div class="app-duration">{{ formatDurationShort(app.total_duration) }}</div>
            <div class="app-bar">
              <div
                class="app-bar-fill"
                :style="{ width: getBarWidth(app.total_duration) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-section mini-heatmap">
        <div class="section-title">使用热力图</div>
        <div class="heatmap-mini-grid">
          <div
            v-for="(row, dayIdx) in heatmapData"
            :key="dayIdx"
            class="heatmap-row"
          >
            <div
              v-for="(value, hourIdx) in row"
              :key="hourIdx"
              class="heatmap-cell"
              :class="'level-' + getHeatmapLevel(value)"
            ></div>
          </div>
        </div>
        <div class="heatmap-labels">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
          <span>23</span>
        </div>
      </div>

      <div class="content-section category-chart">
        <div class="section-title">分类占比</div>
        <div class="doughnut-wrapper">
          <canvas ref="doughnutCanvas" width="140" height="140"></canvas>
          <div class="doughnut-center">
            <div class="center-label">{{ totalCategories }}</div>
            <div class="center-sub">分类</div>
          </div>
        </div>
        <div class="category-legend">
          <div
            v-for="(cat, idx) in categorySummary"
            :key="cat.category"
            class="legend-item"
          >
            <span class="legend-color" :style="{ background: getCategoryColor(idx) }"></span>
            <span class="legend-name">{{ cat.category }}</span>
            <span class="legend-percent">{{ getCategoryPercent(cat.total_duration) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card-footer">
      <span class="footer-text">ScreenTime Tracker</span>
      <span class="footer-date">{{ exportDate }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { getAppIcon, formatDurationShort } from '../utils/appIcons'

ChartJS.register(ArcElement, Tooltip)

const props = defineProps({
  exportData: {
    type: Object,
    default: () => ({})
  },
  isHidden: {
    type: Boolean,
    default: true
  }
})

const reportCardRef = ref(null)
const doughnutCanvas = ref(null)
let chartInstance = null

const CATEGORY_COLORS = [
  '#66fcb8',
  '#4de0a0',
  '#ff9f43',
  '#54a0ff',
  '#c8d6e5',
  '#ff6b6b',
  '#a29bfe',
  '#fdcb6e'
]

const dateRangeText = computed(() => {
  if (!props.exportData.startDate || !props.exportData.endDate) return ''
  if (props.exportData.startDate === props.exportData.endDate) {
    return props.exportData.startDate
  }
  return `${props.exportData.startDate} 至 ${props.exportData.endDate}`
})

const totalHours = computed(() => {
  return Math.floor((props.exportData.totalDuration || 0) / 3600000)
})

const totalMinutes = computed(() => {
  return Math.floor(((props.exportData.totalDuration || 0) % 3600000) / 60000)
})

const daysTracked = computed(() => {
  return Object.keys(props.exportData.dailyData || {}).length
})

const topApps = computed(() => {
  const appMap = {}
  const dailyData = props.exportData.dailyData || {}
  
  for (const date of Object.keys(dailyData)) {
    const dayData = dailyData[date]
    for (const app of dayData.apps || []) {
      if (!appMap[app.process_name]) {
        appMap[app.process_name] = {
          process_name: app.process_name,
          total_duration: 0
        }
      }
      appMap[app.process_name].total_duration += app.total_duration
    }
  }
  
  return Object.values(appMap)
    .sort((a, b) => b.total_duration - a.total_duration)
    .slice(0, 5)
})

const maxAppDuration = computed(() => {
  if (topApps.value.length === 0) return 1
  return Math.max(...topApps.value.map(a => a.total_duration))
})

const categorySummary = computed(() => {
  return props.exportData.categorySummary || []
})

const totalCategories = computed(() => {
  return categorySummary.value.length
})

const totalCategoryDuration = computed(() => {
  return categorySummary.value.reduce((sum, c) => sum + c.total_duration, 0) || 1
})

const heatmapData = computed(() => {
  const dailyData = props.exportData.dailyData || {}
  const dates = Object.keys(dailyData).sort().slice(-7)
  const result = []
  
  for (const date of dates) {
    const dayHeatmap = new Array(24).fill(0)
    const dayData = dailyData[date]
    for (const session of dayData.sessions || []) {
      const startHour = new Date(session.start_time).getHours()
      const endHour = new Date(session.end_time).getHours()
      for (let h = startHour; h <= endHour; h++) {
        if (h >= 0 && h < 24) {
          dayHeatmap[h] += session.duration / (endHour - startHour + 1)
        }
      }
    }
    result.push(dayHeatmap)
  }
  
  while (result.length < 7) {
    result.unshift(new Array(24).fill(0))
  }
  
  return result
})

const maxHeatmapValue = computed(() => {
  let max = 0
  heatmapData.value.forEach(row => {
    row.forEach(v => { if (v > max) max = v })
  })
  return max > 0 ? max : 1
})

const exportDate = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
})

function getDisplayName(processName) {
  const iconInfo = getAppIcon(processName)
  if (iconInfo.label !== processName) {
    return iconInfo.label
  }
  const name = processName.replace(/\.(exe|app|lnk|bat|cmd)$/i, '')
  if (name.length > 12) {
    return name.slice(0, 10) + '...'
  }
  return name
}

function getBarWidth(duration) {
  return (duration / maxAppDuration.value) * 100
}

function getHeatmapLevel(value) {
  if (value <= 0) return 0
  const ratio = value / maxHeatmapValue.value
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

function getCategoryColor(index) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length]
}

function getCategoryPercent(duration) {
  return Math.round((duration / totalCategoryDuration.value) * 100)
}

function renderDoughnutChart() {
  if (!doughnutCanvas.value) return
  
  if (chartInstance) {
    chartInstance.destroy()
  }
  
  const ctx = doughnutCanvas.value.getContext('2d')
  
  chartInstance = new ChartJS(ctx, {
    type: 'doughnut',
    data: {
      labels: categorySummary.value.map(c => c.category),
      datasets: [{
        data: categorySummary.value.map(c => c.total_duration),
        backgroundColor: categorySummary.value.map((_, i) => getCategoryColor(i)),
        borderWidth: 0,
        hoverOffset: 0
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: true,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      animation: false
    }
  })
}

async function captureCard() {
  await nextTick()
  if (!reportCardRef.value) return null
  
  const html2canvas = (await import('html2canvas')).default
  
  const canvas = await html2canvas(reportCardRef.value, {
    backgroundColor: '#1a1a2e',
    scale: 2,
    useCORS: true,
    logging: false
  })
  
  return canvas.toDataURL('image/png')
}

defineExpose({
  captureCard,
  renderDoughnutChart
})

watch(() => props.exportData, () => {
  if (props.exportData && !props.isHidden) {
    nextTick(() => {
      renderDoughnutChart()
    })
  }
}, { deep: true })

onMounted(() => {
  if (props.exportData && !props.isHidden) {
    renderDoughnutChart()
  }
})
</script>

<style scoped>
.export-report-card {
  width: 480px;
  min-height: 640px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 24px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #fff;
  position: absolute;
  left: -9999px;
  top: -9999px;
  opacity: 1;
}

.export-report-card.is-hidden {
  visibility: hidden;
  pointer-events: none;
}

.card-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(102, 252, 184, 0.2);
}

.card-title {
  font-size: 22px;
  font-weight: 700;
  color: #66fcb8;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.card-date-range {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.card-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.summary-item {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}

.summary-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
}

.value-hours,
.value-number {
  font-size: 28px;
  font-weight: 700;
  color: #66fcb8;
  line-height: 1;
}

.value-minutes {
  font-size: 20px;
  font-weight: 600;
  color: #4de0a0;
  line-height: 1;
}

.value-unit {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 2px;
  margin-right: 4px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.content-section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 14px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 10px;
  letter-spacing: 0.5px;
}

.app-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.app-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-rank {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.app-rank.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffa500);
  color: #1a1a2e;
}

.app-rank.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #1a1a2e;
}

.app-rank.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  color: #fff;
}

.app-name {
  flex: 1;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-duration {
  font-size: 10px;
  font-weight: 600;
  color: #66fcb8;
  flex-shrink: 0;
  min-width: 45px;
  text-align: right;
}

.app-bar {
  width: 60px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}

.app-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #66fcb8, #4de0a0);
  border-radius: 2px;
}

.heatmap-mini-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
}

.heatmap-row {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 2px;
}

.heatmap-cell {
  aspect-ratio: 1;
  border-radius: 2px;
  min-height: 8px;
}

.heatmap-cell.level-0 {
  background: rgba(255, 255, 255, 0.05);
}

.heatmap-cell.level-1 {
  background: rgba(102, 252, 184, 0.2);
}

.heatmap-cell.level-2 {
  background: rgba(102, 252, 184, 0.4);
}

.heatmap-cell.level-3 {
  background: rgba(102, 252, 184, 0.7);
}

.heatmap-cell.level-4 {
  background: #66fcb8;
}

.heatmap-labels {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  padding: 0 2px;
}

.doughnut-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto 12px;
}

.doughnut-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}

.doughnut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.center-label {
  font-size: 24px;
  font-weight: 700;
  color: #66fcb8;
  line-height: 1;
}

.center-sub {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
}

.legend-color {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-name {
  color: rgba(255, 255, 255, 0.8);
}

.legend-percent {
  color: #66fcb8;
  font-weight: 600;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.footer-date {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}
</style>
