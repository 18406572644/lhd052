<template>
  <div class="scatter-card">
    <div class="scatter-header">
      <span class="scatter-label">📊 交叉分析</span>
    </div>

    <div class="mode-btns">
      <button
        v-for="m in modes"
        :key="m.type"
        class="mode-btn"
        :class="{ active: metricType === m.type }"
        @click="metricType = m.type"
      >{{ m.label }}</button>
    </div>

    <div class="days-btns">
      <button
        v-for="d in dayOptions"
        :key="d"
        class="day-btn"
        :class="{ active: days === d }"
        @click="days = d"
      >{{ d }}天</button>
    </div>

    <div class="chart-wrap" v-if="scatterData.points.length > 0">
      <Scatter :data="chartData" :options="chartOptions" />
    </div>
    <div class="no-data" v-else>
      <span class="no-data-icon">📉</span>
      <span class="no-data-text">暂无数据</span>
    </div>

    <div class="trend-info" v-if="scatterData.trendLine && scatterData.points.length > 0">
      <span class="trend-eq">{{ trendEquation }}</span>
      <span class="trend-r2">R² = {{ rSquared }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Scatter } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js'

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Filler)

const modes = [
  { type: 'vision', label: '屏幕时长 vs 视力疲劳' },
  { type: 'cervical', label: '久坐段数 vs 颈椎舒适度' }
]

const dayOptions = [7, 14, 30]

const metricType = ref('vision')
const days = ref(7)

const scatterData = ref({ points: [], trendLine: null })

const xLabel = computed(() =>
  metricType.value === 'vision' ? '屏幕时长 (h)' : '久坐段数'
)

const yLabel = computed(() =>
  metricType.value === 'vision' ? '视力疲劳' : '颈椎舒适度'
)

const chartData = computed(() => {
  const pts = scatterData.value.points.map(p => ({ x: p.x, y: p.y }))
  const datasets = [
    {
      label: '数据点',
      data: pts,
      backgroundColor: 'rgba(102, 252, 184, 0.7)',
      borderColor: '#66fcb8',
      borderWidth: 1,
      pointRadius: 4,
      pointHoverRadius: 6
    }
  ]

  const tl = scatterData.value.trendLine
  if (tl && tl.start && tl.end) {
    datasets.push({
      label: '趋势线',
      data: [{ x: tl.start.x, y: tl.start.y }, { x: tl.end.x, y: tl.end.y }],
      type: 'line',
      borderColor: 'rgba(102, 252, 184, 0.4)',
      borderWidth: 1.5,
      borderDash: [6, 3],
      pointRadius: 0,
      fill: false
    })
  }

  return { datasets }
})

const chartOptions = computed(() => ({
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
        title(items) {
          if (!items.length) return ''
          const raw = scatterData.value.points[items[0].dataIndex]
          return raw?.date ?? ''
        },
        label(item) {
          return `${xLabel.value}: ${item.parsed.x}  ${yLabel.value}: ${item.parsed.y}`
        }
      }
    }
  },
  scales: {
    x: {
      title: { display: true, text: xLabel.value, color: '#9aa7b8', font: { size: 9 } },
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: '#9aa7b8', font: { size: 8 } },
      border: { color: 'rgba(255, 255, 255, 0.08)' }
    },
    y: {
      title: { display: true, text: yLabel.value, color: '#9aa7b8', font: { size: 9 } },
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: '#9aa7b8', font: { size: 8 }, stepSize: 2 },
      border: { color: 'rgba(255, 255, 255, 0.08)' },
      min: 0,
      max: 10
    }
  }
}))

const trendEquation = computed(() => {
  const tl = scatterData.value.trendLine
  if (!tl) return ''
  const sign = tl.intercept >= 0 ? '+' : '-'
  const absInt = Math.abs(tl.intercept).toFixed(2)
  return `y = ${tl.slope.toFixed(2)}x ${sign} ${absInt}`
})

const rSquared = computed(() => {
  const pts = scatterData.value.points
  if (pts.length < 2) return '—'
  const ys = pts.map(p => p.y)
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length
  let ssTot = 0
  let ssRes = 0
  const tl = scatterData.value.trendLine
  if (!tl) return '—'
  for (const p of pts) {
    ssTot += (p.y - meanY) ** 2
    const yPred = tl.slope * p.x + tl.intercept
    ssRes += (p.y - yPred) ** 2
  }
  if (ssTot === 0) return '—'
  return (1 - ssRes / ssTot).toFixed(3)
})

async function loadData() {
  try {
    const data = await window.electronAPI.getHealthScatter(metricType.value, days.value)
    if (data) {
      scatterData.value = { points: data.points ?? [], trendLine: data.trendLine ?? null }
    }
  } catch (e) {
    console.error('加载散点数据失败:', e)
    scatterData.value = { points: [], trendLine: null }
  }
}

watch([metricType, days], () => { loadData() })

onMounted(() => { loadData() })
</script>

<style scoped>
.scatter-card {
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
}

.scatter-header {
  margin-bottom: 8px;
}

.scatter-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.mode-btns {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}

.mode-btn {
  flex: 1;
  padding: 4px 2px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mode-btn.active {
  background: rgba(102, 252, 184, 0.15);
  border-color: var(--accent-color);
  color: var(--accent-color);
  font-weight: 600;
}

.mode-btn:hover:not(.active) {
  border-color: rgba(102, 252, 184, 0.3);
  color: var(--text-secondary);
}

.days-btns {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.day-btn {
  padding: 3px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.day-btn.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #0f1923;
  font-weight: 600;
}

.day-btn:hover:not(.active) {
  color: var(--text-secondary);
}

.chart-wrap {
  height: 180px;
  position: relative;
}

.no-data {
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.no-data-icon {
  font-size: 24px;
  opacity: 0.5;
}

.no-data-text {
  font-size: 10px;
  color: var(--text-muted);
}

.trend-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.trend-eq {
  font-size: 9px;
  color: var(--accent-color);
  font-family: monospace;
}

.trend-r2 {
  font-size: 9px;
  color: var(--text-muted);
  font-family: monospace;
}
</style>
