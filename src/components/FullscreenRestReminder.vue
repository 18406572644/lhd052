<template>
  <Transition name="fade">
    <div v-if="visible" class="fullscreen-overlay">
      <div class="rest-content">
        <div class="rest-icon">🌿</div>
        <div class="rest-title">休息时间到</div>
        <div class="rest-message">
          已连续使用 <strong class="highlight">{{ consecutiveMinutes }}</strong> 分钟
        </div>
        <div class="rest-submessage">
          建议休息 <strong class="highlight">{{ restDuration }}</strong> 分钟
        </div>

        <div v-if="isResting" class="timer-section">
          <div class="timer-ring">
            <svg class="ring-svg" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6" />
              <circle
                class="ring-progress"
                cx="60" cy="60" r="52"
                fill="none"
                stroke="var(--accent-color)"
                stroke-width="6"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="dashOffset"
              />
            </svg>
            <div class="timer-text">
              <div class="timer-value">{{ formatTime(remainingSeconds) }}</div>
              <div class="timer-label">休息倒计时</div>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button v-if="!isResting" class="btn-skip" @click="handleSkip">
            跳过本次
          </button>
          <button v-if="!isResting" class="btn-start" @click="handleStartRest">
            开始休息
          </button>
          <button v-if="isResting" class="btn-end" @click="handleEndRest">
            结束休息
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  reminderData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'skip', 'start'])

const isResting = ref(false)
const remainingSeconds = ref(0)
const totalSeconds = ref(0)
let timerInterval = null

const consecutiveMinutes = computed(() => {
  return props.reminderData?.consecutiveMinutes || 45
})

const restDuration = computed(() => {
  return props.reminderData?.restDuration || 5
})

const circumference = 2 * Math.PI * 52

const dashOffset = computed(() => {
  if (totalSeconds.value === 0) return 0
  const progress = remainingSeconds.value / totalSeconds.value
  return circumference * (1 - progress)
})

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function startTimer() {
  clearTimer()
  timerInterval = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--
    } else {
      handleEndRest()
    }
  }, 1000)
}

function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

async function handleStartRest() {
  isResting.value = true
  totalSeconds.value = restDuration.value * 60
  remainingSeconds.value = totalSeconds.value
  startTimer()
  await window.electronAPI.startRestBreak()
  emit('start')
}

async function handleSkip() {
  await window.electronAPI.skipRestBreak()
  clearTimer()
  isResting.value = false
  emit('skip')
}

async function handleEndRest() {
  clearTimer()
  isResting.value = false
  await window.electronAPI.endRestBreak()
  emit('close')
}

function handleRestBreakStart(data) {
  isResting.value = true
  if (data.restDuration) {
    totalSeconds.value = data.restDuration * 60
    remainingSeconds.value = totalSeconds.value
    startTimer()
  }
}

function handleRestBreakEnd() {
  clearTimer()
  isResting.value = false
  emit('close')
}

watch(() => props.visible, (newVal) => {
  if (!newVal) {
    clearTimer()
    isResting.value = false
  }
})

onMounted(() => {
  window.electronAPI.onRestBreakStart(handleRestBreakStart)
  window.electronAPI.onRestBreakEnd(handleRestBreakEnd)
})

onUnmounted(() => {
  clearTimer()
})
</script>

<style scoped>
.fullscreen-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.rest-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px;
  text-align: center;
}

.rest-icon {
  font-size: 64px;
  line-height: 1;
  animation: breathe 3s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.rest-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 2px;
}

.rest-message,
.rest-submessage {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.highlight {
  color: var(--accent-color);
  font-weight: 600;
  font-size: 18px;
}

.timer-section {
  margin: 24px 0;
}

.timer-ring {
  position: relative;
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-progress {
  transition: stroke-dashoffset 1s linear;
}

.timer-text {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.timer-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--accent-color);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 20px rgba(102, 252, 184, 0.4);
}

.timer-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

.btn-skip,
.btn-start,
.btn-end {
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 140px;
}

.btn-skip {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.btn-skip:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
}

.btn-start {
  background: linear-gradient(135deg, var(--accent-color), #4de0a0);
  color: #0f1923;
  box-shadow: 0 4px 20px rgba(102, 252, 184, 0.3);
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(102, 252, 184, 0.4);
}

.btn-end {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
  border: 1px solid rgba(255, 107, 107, 0.3);
}

.btn-end:hover {
  background: rgba(255, 107, 107, 0.25);
}
</style>
