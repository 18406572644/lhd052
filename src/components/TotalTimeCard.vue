<template>
  <div class="total-card">
    <div class="total-header">
      <span class="total-label">今日总时长</span>
      <span class="total-date">{{ todayDate }}</span>
    </div>
    <div class="total-main">
      <div class="total-time">
        <span class="time-value">{{ hours }}</span>
        <span class="time-unit">时</span>
        <span class="time-value">{{ minutes }}</span>
        <span class="time-unit">分</span>
      </div>
      <div class="total-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-hint">目标 8 小时 · {{ progressPercent }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDuration } from '../utils/appIcons'

const props = defineProps({
  totalTime: {
    type: Number,
    default: 0
  }
})

const todayDate = computed(() => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周四', '周六']
  return `${month}月${day}日 ${weekdays[now.getDay()]}`
})

const hours = computed(() => {
  return Math.floor(props.totalTime / 3600000)
})

const minutes = computed(() => {
  return Math.floor((props.totalTime % 3600000) / 60000)
})

const progressPercent = computed(() => {
  const goal = 8 * 3600 * 1000
  return Math.min(100, Math.round((props.totalTime / goal) * 100))
})
</script>

<style scoped>
.total-card {
  background: linear-gradient(135deg, rgba(102, 252, 184, 0.12) 0%, rgba(102, 252, 184, 0.04) 100%);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}

.total-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.total-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.total-date {
  font-size: 10px;
  color: var(--text-muted);
}

.total-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.total-time {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.time-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--accent-color);
  line-height: 1;
  letter-spacing: -0.5px;
}

.time-unit {
  font-size: 13px;
  color: var(--text-secondary);
  margin-right: 8px;
  margin-left: 2px;
  font-weight: 500;
}

.total-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color), #4de0a0);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.progress-hint {
  font-size: 10px;
  color: var(--text-muted);
}
</style>
