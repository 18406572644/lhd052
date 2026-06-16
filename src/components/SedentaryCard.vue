<template>
  <div class="sed-card">
    <div class="sed-header">
      <span class="sed-label">🪑 久坐提醒</span>
      <span class="sed-risk" :style="{ color: riskColor }">{{ riskLabel }}</span>
    </div>
    <div class="sed-body">
      <div class="sed-main">
        <div class="sed-count">
          <span class="count-value">{{ segmentCount }}</span>
          <span class="count-unit">段</span>
        </div>
        <div class="sed-desc">连续 ≥45min</div>
      </div>
      <div class="sed-detail">
        <div class="detail-row">
          <span class="detail-label">建议站立</span>
          <span class="detail-value">{{ suggestedStandUps }} 次</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">判定阈值</span>
          <span class="detail-value">{{ thresholdMin }}min</span>
        </div>
      </div>
      <div class="risk-bar">
        <div
          v-for="n in 5"
          :key="n"
          class="risk-segment"
          :class="{ filled: n <= segmentCount }"
          :style="{ background: n <= segmentCount ? riskColor : 'var(--bg-tertiary)' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sedentary: {
    type: Object,
    default: () => ({})
  }
})

const segmentCount = computed(() => props.sedentary.segments ?? 0)
const suggestedStandUps = computed(() => props.sedentary.suggestedStandUps ?? 0)
const thresholdMin = computed(() => Math.round((props.sedentary.threshold ?? 2700000) / 60000))

const riskColor = computed(() => {
  const s = segmentCount.value
  if (s <= 1) return '#66fcb8'
  if (s <= 3) return '#f59e0b'
  return '#ff6b6b'
})

const riskLabel = computed(() => {
  const s = segmentCount.value
  if (s <= 1) return '低风险'
  if (s <= 3) return '中风险'
  return '高风险'
})
</script>

<style scoped>
.sed-card {
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
}

.sed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.sed-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.sed-risk {
  font-size: 10px;
  font-weight: 600;
}

.sed-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sed-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.count-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.count-unit {
  font-size: 11px;
  color: var(--text-muted);
}

.sed-desc {
  font-size: 9px;
  color: var(--text-muted);
  margin-left: auto;
}

.sed-detail {
  display: flex;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  flex: 1;
}

.detail-label {
  font-size: 10px;
  color: var(--text-muted);
}

.detail-value {
  font-size: 10px;
  color: var(--text-primary);
  font-weight: 500;
}

.risk-bar {
  display: flex;
  gap: 3px;
}

.risk-segment {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  transition: background 0.3s ease;
}
</style>
