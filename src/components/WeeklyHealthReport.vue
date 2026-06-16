<template>
  <div class="weekly-report">
    <div class="report-header">
      <span class="report-title">📋 周健康报告</span>
      <button class="refresh-btn" @click="loadData" :disabled="loading">↻</button>
    </div>

    <div v-if="!report" class="empty-state">
      <span class="empty-icon">📊</span>
      <span class="empty-text">{{ loading ? '加载中...' : '暂无周报数据' }}</span>
    </div>

    <template v-else>
      <div class="grade-card">
        <div class="grade-ring">
          <svg viewBox="0 0 100 100" class="ring-svg">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-tertiary)" stroke-width="6" />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              :stroke="gradeColor"
              stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="ringOffset"
              class="ring-progress"
            />
          </svg>
          <div class="grade-letter" :style="{ color: gradeColor }">{{ report.grade }}</div>
        </div>
        <div class="grade-info">
          <div class="total-score">{{ report.totalScore }}<span class="score-unit">分</span></div>
          <div class="track-days">已追踪 {{ report.daysTracked }} 天</div>
        </div>
      </div>

      <div class="score-section">
        <div class="section-label">评分明细</div>
        <div class="score-bars">
          <div v-for="item in scoreItems" :key="item.key" class="score-row">
            <span class="score-name">{{ item.label }}</span>
            <div class="score-track">
              <div class="score-fill" :style="{ width: item.pct + '%', background: item.color }"></div>
            </div>
            <span class="score-val">{{ report.scores[item.key] }}/{{ item.max }}</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <div class="section-label">周概览</div>
        <div class="stat-row">
          <span class="stat-label">日均屏幕</span>
          <span class="stat-value">{{ formatScreenTime(report.avgScreenTime) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">日均久坐段数</span>
          <span class="stat-value">{{ report.avgSedentary.toFixed(1) }} 次</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">休息达标率</span>
          <span class="stat-value">{{ report.avgRestRatio.toFixed(0) }}%</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">深夜使用天数</span>
          <span class="stat-value" :style="{ color: report.lateNightDays > 2 ? 'var(--danger-color)' : '' }">{{ report.lateNightDays }} 天</span>
        </div>
      </div>

      <div class="suggest-section" v-if="report.suggestions.length > 0">
        <div class="section-label">健康建议</div>
        <div class="suggest-list">
          <div v-for="(s, i) in report.suggestions" :key="i" class="suggest-item">
            <span class="suggest-icon">💡</span>
            <span class="suggest-text">{{ s }}</span>
          </div>
        </div>
      </div>

      <div class="chart-section">
        <div class="section-label">每日屏幕时长</div>
        <div class="chart-wrap" v-if="report.dailyData.length > 0">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
        <div class="no-chart" v-else>
          <span class="no-chart-text">暂无数据</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const report = ref(null)
const loading = ref(false)

const gradeColorMap = { A: '#66fcb8', B: '#4de0a0', C: '#fbbf24', D: '#ff6b6b' }

const gradeColor = computed(() => gradeColorMap[report.value?.grade] || '#66fcb8')

const circumference = 2 * Math.PI * 42

const ringOffset = computed(() => {
  if (!report.value) return circumference
  const pct = report.value.totalScore / 100
  return circumference * (1 - pct)
})

const scoreItems = computed(() => {
  if (!report.value) return []
  const s = report.value.scores
  return [
    { key: 'screen', label: '屏幕时长', max: 40, pct: (s.screen / 40) * 100, color: barColor(s.screen, 40) },
    { key: 'sedentary', label: '久坐控制', max: 30, pct: (s.sedentary / 30) * 100, color: barColor(s.sedentary, 30) },
    { key: 'rest', label: '休息质量', max: 20, pct: (s.rest / 20) * 100, color: barColor(s.rest, 20) },
    { key: 'night', label: '睡眠时段', max: 10, pct: (s.night / 10) * 100, color: barColor(s.night, 10) }
  ]
})

function barColor(score, max) {
  const pct = score / max
  if (pct >= 0.7) return '#66fcb8'
  if (pct >= 0.4) return '#fbbf24'
  return '#ff6b6b'
}

function formatScreenTime(ms) {
  if (!ms) return '0h 0m'
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h ${m}m`
}

const chartData = computed(() => {
  if (!report.value?.dailyData?.length) return { labels: [], datasets: [] }
  const daily = report.value.dailyData
  return {
    labels: daily.map(d => {
      const parts = d.date.split('-')
      return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d.date.slice(5)
    }),
    datasets: [{
      data: daily.map(d => Math.round((d.screenTime / 3600000) * 10) / 10),
      backgroundColor: 'rgba(102, 252, 184, 0.5)',
      borderColor: '#66fcb8',
      borderWidth: 1,
      borderRadius: 3,
      barPercentage: 0.7
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(20, 25, 35, 0.9)',
      titleColor: '#e8edf2',
      bodyColor: '#9aa7b8',
      borderColor: 'rgba(102, 252, 184, 0.2)',
      borderWidth: 1,
      padding: 6,
      titleFont: { size: 10 },
      bodyFont: { size: 9 },
      callbacks: {
        label(ctx) {
          return `${ctx.parsed.y} 小时`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#6b7a8c', font: { size: 8 } },
      border: { color: 'rgba(255, 255, 255, 0.08)' }
    },
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: '#6b7a8c', font: { size: 8 }, callback: v => v + 'h' },
      border: { color: 'rgba(255, 255, 255, 0.08)' },
      beginAtZero: true
    }
  }
}

async function loadData() {
  loading.value = true
  try {
    const data = await window.electronAPI.getWeeklyHealthReport()
    if (data) report.value = data
  } catch (e) {
    console.error('加载周报数据失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.weekly-report {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.report-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.refresh-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  color: var(--accent-color);
  border-color: var(--accent-color);
}

.refresh-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px 12px;
  background: var(--bg-secondary);
  border-radius: 10px;
  border: 1px dashed var(--border-color);
}

.empty-icon {
  font-size: 24px;
  opacity: 0.5;
}

.empty-text {
  font-size: 11px;
  color: var(--text-muted);
}

.grade-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 12px;
  border: 1px solid var(--border-color);
}

.grade-ring {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-progress {
  transition: stroke-dashoffset 0.6s ease;
}

.grade-letter {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
}

.grade-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.total-score {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

.score-unit {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  margin-left: 2px;
}

.track-days {
  font-size: 10px;
  color: var(--text-muted);
}

.score-section,
.stats-section,
.suggest-section,
.chart-section {
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.score-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.score-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.score-name {
  font-size: 10px;
  color: var(--text-muted);
  width: 48px;
  flex-shrink: 0;
}

.score-track {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.score-val {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 500;
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
}

.stat-row:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.stat-label {
  font-size: 10px;
  color: var(--text-muted);
}

.stat-value {
  font-size: 10px;
  color: var(--text-primary);
  font-weight: 600;
}

.suggest-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggest-item {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  align-items: flex-start;
}

.suggest-icon {
  font-size: 10px;
  flex-shrink: 0;
  line-height: 1.5;
}

.suggest-text {
  font-size: 10px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.chart-wrap {
  height: 100px;
  position: relative;
}

.no-chart {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-chart-text {
  font-size: 10px;
  color: var(--text-muted);
}
</style>
