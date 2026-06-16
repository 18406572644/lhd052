<template>
  <div class="metrics-card">
    <div class="metrics-header">
      <span class="metrics-label">📋 身体指标录入</span>
      <span class="metrics-date">{{ todayStr }}</span>
    </div>

    <div class="metrics-body">
      <div class="field" v-for="f in sliderFields" :key="f.key">
        <div class="field-top">
          <span class="field-name">{{ f.icon }} {{ f.label }}</span>
          <span class="field-badge" :style="{ color: getLevelColor(f.key, form[f.key]), borderColor: getLevelColor(f.key, form[f.key]) + '40', background: getLevelColor(f.key, form[f.key]) + '18' }">
            {{ getLevelLabel(f.key, form[f.key]) }}
          </span>
        </div>
        <div class="field-slider">
          <input
            type="range"
            :min="0"
            :max="10"
            :step="1"
            :value="form[f.key]"
            @input="form[f.key] = Number($event.target.value)"
            class="slider"
          />
          <span class="slider-value">{{ form[f.key] }}</span>
        </div>
      </div>

      <div class="field">
        <span class="field-name">📝 备注</span>
        <input
          type="text"
          v-model="form.notes"
          class="notes-input"
          placeholder="可选，记录今日身体感受…"
          maxlength="100"
        />
      </div>
    </div>

    <button class="save-btn" @click="handleSave" :disabled="saving">
      {{ saving ? '保存中…' : '💾 保存' }}
    </button>

    <Transition name="toast">
      <div class="toast" v-if="showToast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const sliderFields = [
  { key: 'vision_fatigue', label: '视力疲劳', icon: '👁' },
  { key: 'cervical_comfort', label: '颈椎舒适度', icon: '🦴' },
  { key: 'sleep_quality', label: '睡眠质量', icon: '😴' },
  { key: 'overall_feeling', label: '整体感受', icon: '💚' }
]

const form = reactive({
  vision_fatigue: 0,
  cervical_comfort: 0,
  sleep_quality: 0,
  overall_feeling: 0,
  notes: ''
})

const saving = ref(false)
const showToast = ref(false)
const toastMsg = ref('')

function getTodayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayStr = getTodayStr()

function getLevelLabel(key, val) {
  if (key === 'vision_fatigue') {
    if (val <= 2) return '舒适'
    if (val <= 5) return '轻度疲劳'
    if (val <= 8) return '中度疲劳'
    return '重度疲劳'
  }
  if (key === 'cervical_comfort') {
    if (val <= 2) return '不适'
    if (val <= 5) return '僵硬'
    if (val <= 8) return '尚可'
    return '舒适'
  }
  if (key === 'sleep_quality') {
    if (val <= 3) return '较差'
    if (val <= 6) return '一般'
    return '良好'
  }
  if (key === 'overall_feeling') {
    if (val <= 3) return '不佳'
    if (val <= 6) return '一般'
    return '良好'
  }
  return ''
}

function getLevelColor(key, val) {
  if (key === 'vision_fatigue') {
    if (val <= 2) return '#66fcb8'
    if (val <= 5) return '#fbbf24'
    if (val <= 8) return '#f97316'
    return '#ff6b6b'
  }
  if (key === 'cervical_comfort') {
    if (val <= 2) return '#ff6b6b'
    if (val <= 5) return '#f97316'
    if (val <= 8) return '#fbbf24'
    return '#66fcb8'
  }
  if (key === 'sleep_quality') {
    if (val <= 3) return '#ff6b6b'
    if (val <= 6) return '#fbbf24'
    return '#66fcb8'
  }
  if (key === 'overall_feeling') {
    if (val <= 3) return '#ff6b6b'
    if (val <= 6) return '#fbbf24'
    return '#66fcb8'
  }
  return '#66fcb8'
}

function flashToast(msg) {
  toastMsg.value = msg
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2000)
}

async function handleSave() {
  saving.value = true
  try {
    const metric = {
      date: todayStr,
      vision_fatigue: form.vision_fatigue,
      cervical_comfort: form.cervical_comfort,
      sleep_quality: form.sleep_quality,
      overall_feeling: form.overall_feeling,
      notes: form.notes
    }
    await window.electronAPI.saveBodyMetric(metric)
    flashToast('✓ 保存成功')
  } catch (e) {
    console.error('保存失败:', e)
    flashToast('✗ 保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const data = await window.electronAPI.getBodyMetric(todayStr)
    if (data) {
      form.vision_fatigue = data.vision_fatigue ?? 0
      form.cervical_comfort = data.cervical_comfort ?? 0
      form.sleep_quality = data.sleep_quality ?? 0
      form.overall_feeling = data.overall_feeling ?? 0
      form.notes = data.notes ?? ''
    }
  } catch (e) {
    console.error('加载指标失败:', e)
  }
})
</script>

<style scoped>
.metrics-card {
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  position: relative;
}

.metrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.metrics-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.metrics-date {
  font-size: 9px;
  color: var(--text-muted);
  font-family: monospace;
}

.metrics-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-name {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 500;
}

.field-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 8px;
  border: 1px solid;
  line-height: 1.4;
}

.field-slider {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-color);
  cursor: pointer;
  border: 2px solid var(--bg-primary);
  box-shadow: 0 0 4px rgba(102, 252, 184, 0.3);
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.slider-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-color);
  min-width: 18px;
  text-align: center;
}

.notes-input {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 10px;
  outline: none;
  transition: border-color 0.2s ease;
}

.notes-input::placeholder {
  color: var(--text-muted);
}

.notes-input:focus {
  border-color: var(--accent-color);
}

.save-btn {
  width: 100%;
  margin-top: 10px;
  padding: 7px 0;
  border: none;
  border-radius: 8px;
  background: var(--accent-color);
  color: #0f1923;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.save-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toast {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 14px;
  border-radius: 6px;
  background: var(--accent-color);
  color: #0f1923;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(102, 252, 184, 0.3);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
