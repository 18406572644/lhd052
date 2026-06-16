<template>
  <div class="rest-card">
    <div class="rest-header">
      <span class="rest-label">☕ 休息行为</span>
    </div>
    <div class="rest-body">
      <div class="rest-stats">
        <div class="stat-item">
          <span class="stat-value">{{ breakCount }}</span>
          <span class="stat-label">次休息</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ avgDuration }}m</span>
          <span class="stat-label">平均时长</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value" :style="{ color: ratioColor }">{{ restRatioPct }}%</span>
          <span class="stat-label">休息比例</span>
        </div>
      </div>
      <div class="rest-progress">
        <div class="progress-track">
          <div
            class="progress-fill"
            :style="{ width: fillWidth + '%', background: ratioColor }"
          ></div>
          <div class="progress-target" :style="{ left: targetPct + '%' }"></div>
        </div>
        <div class="progress-labels">
          <span class="progress-hint">目标 {{ targetPct }}%</span>
          <span class="progress-status" :style="{ color: ratioColor }">
            {{ isOnTarget ? '✓ 达标' : '未达标' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  restBehavior: {
    type: Object,
    default: () => ({})
  }
})

const breakCount = computed(() => props.restBehavior.activeBreakCount ?? 0)
const avgDuration = computed(() => Math.round((props.restBehavior.avgRestDuration ?? 0) / 60000))
const restRatioPct = computed(() => Math.round((props.restBehavior.restRatio ?? 0) * 100))
const targetPct = computed(() => Math.round((props.restBehavior.targetRestRatio ?? 0.1) * 100))

const isOnTarget = computed(() => restRatioPct.value >= targetPct.value)
const ratioColor = computed(() => isOnTarget.value ? '#66fcb8' : '#f59e0b')
const fillWidth = computed(() => Math.min(100, restRatioPct.value))
</script>

<style scoped>
.rest-card {
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
}

.rest-header {
  margin-bottom: 8px;
}

.rest-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.rest-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rest-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.stat-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 9px;
  color: var(--text-muted);
}

.stat-divider {
  width: 1px;
  height: 22px;
  background: var(--border-color);
}

.rest-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-track {
  height: 5px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  position: relative;
  overflow: visible;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease, background 0.3s ease;
}

.progress-target {
  position: absolute;
  top: -2px;
  width: 1px;
  height: 9px;
  background: var(--text-muted);
  transform: translateX(-50%);
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-hint {
  font-size: 9px;
  color: var(--text-muted);
}

.progress-status {
  font-size: 9px;
  font-weight: 600;
}
</style>
