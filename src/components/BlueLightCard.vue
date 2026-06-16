<template>
  <div class="blue-card">
    <div class="blue-header">
      <span class="blue-label">💡 蓝光暴露</span>
      <span class="slot-badge" :style="slotStyle">
        <span class="slot-icon">{{ slotIcon }}</span>
        {{ slotLabel }}
      </span>
    </div>
    <div class="blue-body">
      <div class="blue-exposure">
        <span class="exposure-value">{{ exposure }}</span>
        <span class="exposure-unit">暴露值</span>
      </div>
      <div class="blue-detail">
        <div class="detail-row">
          <span class="detail-label">屏幕时长</span>
          <span class="detail-value">{{ screenHours }}h</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">权重系数</span>
          <span class="detail-value">{{ weight }}</span>
        </div>
      </div>
    </div>
    <div class="night-warning" v-if="isNightHighIntensity" :style="{ borderColor: slotColor, background: slotColor + '15' }">
      <span class="warning-icon">⚠️</span>
      <span class="warning-text">夜间高强度蓝光暴露，建议减少屏幕使用</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  blueLight: {
    type: Object,
    default: () => ({})
  }
})

const exposure = computed(() => props.blueLight.exposure ?? 0)
const weight = computed(() => props.blueLight.weight ?? 1)
const timeSlot = computed(() => props.blueLight.timeSlot ?? 'daytime')
const isNightHighIntensity = computed(() => props.blueLight.isNightHighIntensity ?? false)
const screenHours = computed(() => {
  const h = props.blueLight.screenHours ?? 0
  return h.toFixed(1)
})

const slotColor = computed(() => {
  if (timeSlot.value === 'night') return '#ff6b6b'
  if (timeSlot.value === 'evening') return '#f59e0b'
  return '#66fcb8'
})

const slotIcon = computed(() => {
  if (timeSlot.value === 'night') return '🌙'
  if (timeSlot.value === 'evening') return '🌆'
  return '☀️'
})

const slotLabel = computed(() => {
  if (timeSlot.value === 'night') return '夜间'
  if (timeSlot.value === 'evening') return '傍晚'
  return '白天'
})

const slotStyle = computed(() => ({
  color: slotColor.value,
  borderColor: slotColor.value + '40',
  background: slotColor.value + '18'
}))
</script>

<style scoped>
.blue-card {
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
}

.blue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.blue-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.slot-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 8px;
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 2px;
}

.slot-icon {
  font-size: 10px;
  line-height: 1;
}

.blue-body {
  display: flex;
  align-items: center;
  gap: 14px;
}

.blue-exposure {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.exposure-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

.exposure-unit {
  font-size: 9px;
  color: var(--text-muted);
}

.blue-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
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

.night-warning {
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 5px;
}

.warning-icon {
  font-size: 11px;
  flex-shrink: 0;
}

.warning-text {
  font-size: 9px;
  color: var(--text-secondary);
  line-height: 1.4;
}
</style>
