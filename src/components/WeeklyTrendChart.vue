<template>
  <div class="weekly-trend-container">
    <div class="section-header">
      <span class="section-title">7 天使用趋势</span>
      <span class="section-total">{{ formatDurationShort(weekTotal) }}</span>
    </div>
    <div class="chart-wrapper">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'
import { formatDurationShort } from '../utils/appIcons'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const props = defineProps({
  refreshTrigger: {
    type: Number,
    default: 0
  }
})

const dates = ref([])
const totals = ref([])

const weekTotal = computed(() => {
  return totals.value.reduce((sum, v) => sum + v, 0)
})

const labels = computed(() => {
  return dates.value.map(date => {
    const d = new Date(date)
    const month = d.getMonth() + 1
    const day = d.getDate()
    return `${month}/${day}`
  })
})

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: '使用时长',
    data: totals.value,
    borderColor: '#66fcb8',
    backgroundColor: (context) => {
      const ctx = context.chart.ctx
      const chart = context.chart
      const { chartArea } = chart
      if (!chartArea) return 'rgba(102, 252, 184, 0.1)'
      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
      gradient.addColorStop(0, 'rgba(102, 252, 184, 0.35)')
      gradient.addColorStop(1, 'rgba(102, 252, 184, 0.02)')
      return gradient
    },
    borderWidth: 2,
    fill: true,
    tension: 0.35,
    pointBackgroundColor: '#66fcb8',
    pointBorderColor: 'rgba(20, 25, 35, 0.85)',
    pointBorderWidth: 2,
    pointRadius: 3,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: '#66fcb8',
    pointHoverBorderColor: '#fff',
    pointHoverBorderWidth: 2
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(20, 25, 35, 0.95)',
      titleColor: '#e8edf2',
      bodyColor: '#9aa7b8',
      borderColor: 'rgba(102, 252, 184, 0.2)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
      displayColors: false,
      titleFont: {
        size: 12,
        weight: '600'
      },
      bodyFont: {
        size: 11
      },
      callbacks: {
        title: (items) => {
          if (!items || items.length === 0) return ''
          const idx = items[0].dataIndex
          const date = dates.value[idx]
          const d = new Date(date)
          const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
          const month = d.getMonth() + 1
          const day = d.getDate()
          return `${month}月${day}日 ${weekdays[d.getDay()]}`
        },
        label: (context) => {
          const idx = context.dataIndex
          const value = context.raw
          const durationStr = formatDurationShort(value)
          let changeStr = ''
          if (idx > 0) {
            const prev = totals.value[idx - 1]
            const diff = value - prev
            const diffMinutes = Math.round(diff / 60000)
            if (diff > 0) {
              changeStr = `  ↑ ${diffMinutes}分钟`
            } else if (diff < 0) {
              changeStr = `  ↓ ${Math.abs(diffMinutes)}分钟`
            } else {
              changeStr = '  持平'
            }
          }
          return `时长: ${durationStr}${changeStr}`
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        color: '#6b7a8c',
        font: {
          size: 10
        },
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 7
      },
      border: {
        display: false
      }
    },
    y: {
      grid: {
        color: 'rgba(102, 252, 184, 0.08)',
        drawBorder: false
      },
      ticks: {
        color: '#6b7a8c',
        font: {
          size: 10
        },
        callback: (value) => {
          const hours = Math.floor(value / 3600000)
          if (hours > 0) return `${hours}h`
          const minutes = Math.floor(value / 60000)
          return `${minutes}m`
        },
        maxTicksLimit: 5
      },
      border: {
        display: false
      },
      beginAtZero: true
    }
  },
  interaction: {
    intersect: false,
    mode: 'index'
  }
}

async function loadData() {
  try {
    const data = await window.electronAPI.getWeeklyDailyTotals()
    dates.value = data.dates || []
    totals.value = data.totals || []
  } catch (e) {
    console.error('加载周趋势数据失败:', e)
  }
}

watch(() => props.refreshTrigger, () => {
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.weekly-trend-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
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

.section-total {
  font-size: 10px;
  color: var(--accent-color);
  font-weight: 600;
  background: rgba(102, 252, 184, 0.1);
  padding: 2px 6px;
  border-radius: 8px;
}

.chart-wrapper {
  width: 100%;
  height: 140px;
  position: relative;
}
</style>
