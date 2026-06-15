<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-icon">🚫</div>
      <div class="modal-title">专注模式提醒</div>
      <div class="modal-message">
        <p>当前应用 <strong class="app-name">{{ processName }}</strong> 在屏蔽时间内</p>
        <div class="rule-info" v-for="rule in alertData.rules" :key="rule.id">
          <span class="rule-time-icon">⏰</span>
          <span>{{ rule.start_time }} - {{ rule.end_time }}</span>
        </div>
      </div>
      <div class="modal-tip">
        💡 建议关闭该应用，专注于当前任务
      </div>
      <div class="modal-actions">
        <button class="btn-primary" @click="$emit('close')">
          我知道了
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getAppIcon } from '../utils/appIcons'

const props = defineProps({
  alertData: {
    type: Object,
    required: true
  }
})

defineEmits(['close'])

const processName = computed(() => {
  const iconInfo = getAppIcon(props.alertData.processName)
  if (iconInfo.label !== props.alertData.processName) {
    return `${iconInfo.label} (${props.alertData.processName})`
  }
  return props.alertData.processName
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  width: 240px;
  background: var(--bg-primary);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 107, 107, 0.1);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-icon {
  font-size: 40px;
  line-height: 1;
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--danger-color);
  letter-spacing: 0.5px;
}

.modal-message {
  text-align: center;
  width: 100%;
}

.modal-message p {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.app-name {
  color: var(--text-primary);
  font-weight: 600;
}

.rule-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 6px;
  font-size: 11px;
  color: var(--danger-color);
  font-weight: 500;
}

.rule-time-icon {
  font-size: 12px;
}

.modal-tip {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  width: 100%;
}

.modal-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}

.btn-primary {
  flex: 1;
  background: linear-gradient(135deg, var(--accent-color), #4de0a0);
  color: #0f1419;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 252, 184, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}
</style>
