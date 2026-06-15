<template>
  <div class="heatmap-container">
    <div class="section-header">
      <span class="section-title">每小时活跃度</span>
      <span class="section-total">{{ formatDurationShort(totalTime) }}</span>
    </div>
    <div class="heatmap-grid-wrapper">
      <div class="hour-labels">
        <span v-for="h in labelHours" :key="h" class="hour-label">{{ h }}</span>
      </div>
      <div class="heatmap-grid">
        <div
          v-for="(value, hour) in heatmapData"
          :key="hour"
          class="heatmap-cell"
          :class="'level-' + getLevel(value)"
          :title="getCellTitle(hour, value)"
        ></div>
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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDurationShort } from '../utils/appIcons'

const props = defineProps({
  heatmapData: {
    type: Array,
    default: () => new Array(24).fill(0)
  }
})

const labelHours = [0, 6, 12, 18, 23]

const totalTime = computed(() => {
  return props.heatmapData.reduce((sum, v) => sum + v, 0)
})

const maxValue = computed(() => {
  const max = Math.max(...props.heatmapData)
  return max > 0 ? max : 1
})

function getLevel(value) {
  if (value <= 0) return 0
  const ratio = value / maxValue.value
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

function getCellTitle(hour, value) {
  const timeStr = `${hour.toString().padStart(2, '0')}:00`
  const durationStr = formatDurationShort(value)
  return `${timeStr} - ${durationStr}`
}
</script>

<style scoped>
.heatmap-container {
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
</style>
