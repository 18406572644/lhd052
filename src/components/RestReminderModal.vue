<template>
  <div class="modal-overlay" @click.self="handleOverlayClick">
    <div class="modal-content" :class="{ 'mode-active': isActive }">
      <template v-if="!isActive">
        <div class="modal-icon">👁️</div>
        <div class="modal-title">休息提醒</div>
        <div class="modal-message">
          <p>眼部疲劳指数: <strong class="strain-score">{{ reminderData.eyeStrainScore }}</strong></p>
          <p class="strain-hint">建议让眼睛休息一下</p>
        </div>

        <div class="mode-tabs">
          <button
            class="mode-tab"
            :class="{ active: selectedMode === 'eye' }"
            @click="selectedMode = 'eye'"
          >眼保健操</button>
          <button
            class="mode-tab"
            :class="{ active: selectedMode === 'distant' }"
            @click="selectedMode = 'distant'"
          >远眺模式</button>
        </div>

        <div class="mode-preview">
          <template v-if="selectedMode === 'eye'">
            <div class="preview-icon">🧘</div>
            <div class="preview-text">3分钟眼部运动引导</div>
          </template>
          <template v-else>
            <div class="preview-icon">🔭</div>
            <div class="preview-text">20-20-20 远眺放松</div>
          </template>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="$emit('close')">稍后提醒</button>
          <button class="btn-primary" @click="startExercise">开始休息</button>
        </div>
      </template>

      <template v-else-if="selectedMode === 'eye'">
        <div class="exercise-header">
          <div class="exercise-step-name">{{ steps[currentStep].name }}</div>
          <div class="exercise-step-hint">{{ steps[currentStep].hint }}</div>
        </div>

        <div class="eye-animation-area">
          <svg class="eye-svg" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="60" cy="40" rx="48" ry="32" fill="none" stroke="var(--border-color)" stroke-width="2" />
            <circle cx="60" cy="40" r="18" fill="var(--bg-tertiary)" stroke="var(--accent-color)" stroke-width="1.5" stroke-opacity="0.4" />
            <circle class="pupil" :class="pupilAnimClass" cx="60" cy="40" r="8" fill="var(--accent-color)" />
          </svg>
        </div>

        <div class="step-dots">
          <span
            v-for="(step, i) in steps"
            :key="i"
            class="step-dot"
            :class="{ active: i === currentStep, done: i < currentStep }"
          ></span>
        </div>

        <div class="progress-area">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: eyeProgressPercent + '%' }"></div>
          </div>
          <div class="progress-time">{{ formatTime(eyeRemaining) }}</div>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="stopExercise">结束休息</button>
        </div>
      </template>

      <template v-else>
        <div class="distant-overlay">
          <div class="distant-timer-ring">
            <svg class="ring-svg" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-tertiary)" stroke-width="6" />
              <circle
                class="ring-progress"
                cx="60" cy="60" r="52"
                fill="none"
                stroke="var(--accent-color)"
                stroke-width="6"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="distantDashOffset"
              />
            </svg>
            <div class="distant-countdown">{{ distantRemaining }}</div>
          </div>
          <div class="distant-text">看 20 英尺 (6米) 外的物体 20 秒</div>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="stopExercise">结束休息</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  reminderData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'accept'])

const selectedMode = ref('eye')
const isActive = ref(false)

const steps = [
  { name: '眼球上下转动', hint: '眼睛跟随圆点上下移动', direction: 'up-down' },
  { name: '眼球左右转动', hint: '眼睛跟随圆点左右移动', direction: 'left-right' },
  { name: '眼球画圈转动', hint: '眼睛跟随圆点画圈移动', direction: 'circular' },
  { name: '远眺放松', hint: '放松双眼，眺望远方', direction: 'distance' }
]

const currentStep = ref(0)
const stepElapsed = ref(0)
const EYE_TOTAL = 180
const STEP_DURATION = 15
const eyeRemaining = ref(EYE_TOTAL)
const distantRemaining = ref(20)
const DISTANT_TOTAL = 20
const circumference = 2 * Math.PI * 52

let intervalId = null

const pupilAnimClass = computed(() => {
  const dir = steps[currentStep.value]?.direction
  if (dir === 'up-down') return 'pupil-up-down'
  if (dir === 'left-right') return 'pupil-left-right'
  if (dir === 'circular') return 'pupil-circular'
  return 'pupil-distance'
})

const eyeProgressPercent = computed(() => {
  return ((EYE_TOTAL - eyeRemaining.value) / EYE_TOTAL) * 100
})

const distantDashOffset = computed(() => {
  const progress = distantRemaining.value / DISTANT_TOTAL
  return circumference * (1 - progress)
})

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function startExercise() {
  isActive.value = true
  currentStep.value = 0
  stepElapsed.value = 0
  eyeRemaining.value = EYE_TOTAL
  distantRemaining.value = DISTANT_TOTAL
  emit('accept')
  startTimer()
}

function stopExercise() {
  isActive.value = false
  clearTimer()
  emit('close')
}

function handleOverlayClick() {
  if (!isActive.value) {
    emit('close')
  }
}

function startTimer() {
  clearTimer()
  intervalId = setInterval(() => {
    if (selectedMode.value === 'eye') {
      eyeRemaining.value--
      stepElapsed.value++
      if (stepElapsed.value >= STEP_DURATION) {
        stepElapsed.value = 0
        if (currentStep.value < steps.length - 1) {
          currentStep.value++
        }
      }
      if (eyeRemaining.value <= 0) {
        clearTimer()
        isActive.value = false
        emit('close')
      }
    } else {
      distantRemaining.value--
      if (distantRemaining.value <= 0) {
        clearTimer()
        isActive.value = false
        emit('close')
      }
    }
  }, 1000)
}

function clearTimer() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

onMounted(() => {
  if (props.reminderData?.type) {
    selectedMode.value = props.reminderData.type === 'distant' ? 'distant' : 'eye'
  }
})

onUnmounted(() => {
  clearTimer()
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

.modal-overlay:has(.mode-active) {
  background: rgba(0, 0, 0, 0.75);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  width: 260px;
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
    0 0 0 1px rgba(102, 252, 184, 0.1);
  animation: slideUp 0.3s ease;
}

.modal-content.mode-active {
  border-color: rgba(102, 252, 184, 0.3);
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
  font-size: 36px;
  line-height: 1;
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent-color);
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

.strain-score {
  color: var(--accent-color);
  font-weight: 700;
  font-size: 13px;
}

.strain-hint {
  font-size: 10px !important;
  color: var(--text-muted) !important;
  margin-top: 2px !important;
}

.mode-tabs {
  display: flex;
  width: 100%;
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 3px;
  gap: 3px;
}

.mode-tab {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 6px 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-tab.active {
  background: var(--bg-tertiary);
  color: var(--accent-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.mode-tab:hover:not(.active) {
  color: var(--text-secondary);
}

.mode-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  width: 100%;
}

.preview-icon {
  font-size: 18px;
  line-height: 1;
}

.preview-text {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
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

.btn-secondary {
  flex: 1;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  color: var(--text-primary);
  border-color: rgba(102, 252, 184, 0.3);
}

/* Eye exercise mode */
.exercise-header {
  text-align: center;
}

.exercise-step-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-color);
}

.exercise-step-hint {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}

.eye-animation-area {
  width: 120px;
  height: 80px;
}

.eye-svg {
  width: 100%;
  height: 100%;
}

/* Pupil animations */
.pupil {
  transition: none;
}

.pupil-up-down {
  animation: moveUpDown 2s ease-in-out infinite;
}

.pupil-left-right {
  animation: moveLeftRight 2s ease-in-out infinite;
}

.pupil-circular {
  animation: moveCircular 3s linear infinite;
}

.pupil-distance {
  animation: breatheScale 3s ease-in-out infinite;
}

@keyframes moveUpDown {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-10px); }
  75% { transform: translateY(10px); }
}

@keyframes moveLeftRight {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

@keyframes moveCircular {
  0% { transform: translate(10px, 0); }
  25% { transform: translate(0, -10px); }
  50% { transform: translate(-10px, 0); }
  75% { transform: translate(0, 10px); }
  100% { transform: translate(10px, 0); }
}

@keyframes breatheScale {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
}

.step-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  transition: all 0.3s ease;
}

.step-dot.active {
  background: var(--accent-color);
  box-shadow: 0 0 8px rgba(102, 252, 184, 0.5);
}

.step-dot.done {
  background: rgba(102, 252, 184, 0.4);
}

.progress-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color), #4de0a0);
  border-radius: 2px;
  transition: width 1s linear;
}

.progress-time {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

/* Distant view mode */
.distant-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
}

.distant-timer-ring {
  position: relative;
  width: 110px;
  height: 110px;
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

.distant-countdown {
  font-size: 36px;
  font-weight: 700;
  color: var(--accent-color);
  z-index: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 20px rgba(102, 252, 184, 0.3);
}

.distant-text {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.5;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  width: 100%;
}
</style>
