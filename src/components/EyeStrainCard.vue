<template>
  <div class="eye-card">
    <div class="eye-header">
      <span class="eye-label">👁 眼疲劳指数</span>
    </div>
    <div class="eye-body">
      <div class="gauge-wrap">
        <svg class="gauge-svg" viewBox="0 0 100 100">
          <circle
            class="gauge-bg"
            cx="50" cy="50" r="42"
            fill="none"
            stroke="var(--bg-tertiary)"
            stroke-width="7"
          />
          <circle
            class="gauge-fill"
            cx="50" cy="50" r="42"
            fill="none"
            :stroke="scoreColor"
            stroke-width="7"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div class="gauge-text">
          <span class="gauge-value" :style="{ color: scoreColor }">{{ score }}</span>
          <span class="gauge-unit">/100</span>
        </div>
      </div>
      <div class="eye-metrics">
        <div class="metric-row">
          <span class="metric-label">累计时长</span>
          <span class="metric-value">{{ formatDuration(totalDuration) }}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">最长连续</span>
          <span class="metric-value">{{ formatMinutes(longestContinuous) }}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">高强度占比</span>
          <span class="metric-value">{{ highRatio }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  eyeStrain: {
    type: Object,
    default: () => ({})
  }
})

const score = computed(() => props.eyeStrain.score ?? 0)
const totalDuration = computed(() => props.eyeStrain.totalDuration ?? 0)
const longestContinuous = computed(() => props.eyeStrain.longestContinuousDuration ?? 0)
const highRatio = computed(() => Math.round((props.eyeStrain.highIntensityRatio ?? 0) * 100))

const circumference = 2 * Math.PI * 42
const dashOffset = computed(() => {
  const pct = Math.min(score.value, 100) / 100
  return circumference * (1 - pct)
})

const scoreColor = computed(() => {
  const s = score.value
  if (s <= 30) return '#66fcb8'
  if (s <= 60) return '#fbbf24'
  return '#ff6b6b'
})

function formatDuration(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatMinutes(ms) {
  const m = Math.floor(ms / 60000)
  return `${m}m`
}
</script>

<style scoped>
.eye-card {
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
}

.eye-header {
  margin-bottom: 8px;
}

.eye-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.eye-body {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gauge-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
}

.gauge-svg {
  width: 100%;
  height: 100%;
}

.gauge-fill {
  transition: stroke-dashoffset 0.6s ease, stroke 0.3s ease;
}

.gauge-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: baseline;
  gap: 1px;
}

.gauge-value {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.gauge-unit {
  font-size: 9px;
  color: var(--text-muted);
}

.eye-metrics {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 10px;
  color: var(--text-muted);
}

.metric-value {
  font-size: 11px;
  color: var(--text-primary);
  font-weight: 500;
}
</style>
