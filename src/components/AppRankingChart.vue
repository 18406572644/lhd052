<template>
  <div class="chart-container">
    <div class="section-header">
      <span class="section-title">应用使用排行</span>
      <span class="section-count">{{ appUsage.length }} 个应用</span>
    </div>
    <div class="chart-list" v-if="appUsage.length > 0">
      <div
        v-for="(item, index) in displayData"
        :key="item.process_name"
        class="chart-item"
      >
        <div class="item-left">
          <div class="item-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
          <div class="item-icon">{{ getIcon(item.process_name).icon }}</div>
          <div class="item-info">
            <div class="item-name">{{ getDisplayName(item.process_name) }}</div>
            <div class="item-duration">{{ formatDurationShort(item.total_duration) }}</div>
          </div>
        </div>
        <div class="item-right">
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{ width: getBarWidth(item.total_duration) + '%' }"
            ></div>
          </div>
          <div class="item-percent">{{ getPercent(item.total_duration) }}%</div>
        </div>
      </div>
    </div>
    <div class="empty-state" v-else>
      <div class="empty-icon">📊</div>
      <div class="empty-text">暂无数据</div>
      <div class="empty-hint">开始使用应用后将显示统计</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getAppIcon, formatDurationShort } from '../utils/appIcons'

const props = defineProps({
  appUsage: {
    type: Array,
    default: () => []
  }
})

const maxDuration = computed(() => {
  if (props.appUsage.length === 0) return 1
  return Math.max(...props.appUsage.map(i => i.total_duration))
})

const totalDuration = computed(() => {
  return props.appUsage.reduce((sum, i) => sum + i.total_duration, 0) || 1
})

const displayData = computed(() => {
  return props.appUsage.slice(0, 6)
})

function getIcon(processName) {
  return getAppIcon(processName)
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

function getBarWidth(duration) {
  return (duration / maxDuration.value) * 100
}

function getPercent(duration) {
  return Math.round((duration / totalDuration.value) * 100)
}
</script>

<style scoped>
.chart-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  min-height: 180px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-count {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 8px;
}

.chart-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 110px;
  flex-shrink: 0;
}

.item-rank {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  flex-shrink: 0;
}

.item-rank.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffa500);
  color: #1a1a2e;
}

.item-rank.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #1a1a2e;
}

.item-rank.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  color: #fff;
}

.item-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-duration {
  font-size: 10px;
  color: var(--accent-color);
  font-weight: 600;
}

.item-right {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bar-track {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
  min-width: 40px;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color), #4de0a0);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.item-percent {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
  min-width: 30px;
  text-align: right;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.empty-icon {
  font-size: 28px;
  opacity: 0.5;
}

.empty-text {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.empty-hint {
  font-size: 10px;
  color: var(--text-muted);
}
</style>
