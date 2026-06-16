<template>
  <div class="settings-card">
    <div class="settings-header">
      <span class="settings-label">⏰ 休息提醒设置</span>
      <label class="toggle-switch">
        <input type="checkbox" v-model="settings.enabled" @change="handleToggle" />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="settings-body" :class="{ disabled: !settings.enabled }">
      <div class="setting-row">
        <span class="setting-label">连续使用</span>
        <div class="setting-control">
          <button class="control-btn" @click="decreaseWorkDuration" :disabled="workDuration <= 15">-</button>
          <span class="setting-value">{{ settings.workDuration }} 分钟</span>
          <button class="control-btn" @click="increaseWorkDuration" :disabled="workDuration >= 120">+</button>
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">休息时长</span>
        <div class="setting-control">
          <button class="control-btn" @click="decreaseRestDuration" :disabled="restDuration <= 1">-</button>
          <span class="setting-value">{{ settings.restDuration }} 分钟</span>
          <button class="control-btn" @click="increaseRestDuration" :disabled="restDuration >= 30">+</button>
        </div>
      </div>

      <div class="setting-hint">
        到点将弹出全屏提醒，休息期间暂停计时
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const settings = reactive({
  enabled: true,
  workDuration: 45,
  restDuration: 5
})

const workDuration = ref(45)
const restDuration = ref(5)

async function loadSettings() {
  try {
    const data = await window.electronAPI.getRestReminderSettings()
    if (data) {
      settings.enabled = data.enabled
      settings.workDuration = data.workDuration
      settings.restDuration = data.restDuration
      workDuration.value = data.workDuration
      restDuration.value = data.restDuration
    }
  } catch (e) {
    console.error('加载休息提醒设置失败:', e)
  }
}

async function saveSettings() {
  try {
    await window.electronAPI.saveRestReminderSettings({
      enabled: settings.enabled,
      workDuration: settings.workDuration,
      restDuration: settings.restDuration
    })
  } catch (e) {
    console.error('保存休息提醒设置失败:', e)
  }
}

function handleToggle() {
  saveSettings()
}

function decreaseWorkDuration() {
  if (settings.workDuration > 15) {
    settings.workDuration -= 5
    workDuration.value = settings.workDuration
    saveSettings()
  }
}

function increaseWorkDuration() {
  if (settings.workDuration < 120) {
    settings.workDuration += 5
    workDuration.value = settings.workDuration
    saveSettings()
  }
}

function decreaseRestDuration() {
  if (settings.restDuration > 1) {
    settings.restDuration -= 1
    restDuration.value = settings.restDuration
    saveSettings()
  }
}

function increaseRestDuration() {
  if (settings.restDuration < 30) {
    settings.restDuration += 1
    restDuration.value = settings.restDuration
    saveSettings()
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-card {
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.settings-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--bg-tertiary);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 2px;
  top: 2px;
  background: var(--text-muted);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.toggle-switch input:checked + .toggle-slider {
  background: rgba(102, 252, 184, 0.3);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(16px);
  background: var(--accent-color);
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: opacity 0.2s ease;
}

.settings-body.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.control-btn:hover:not(:disabled) {
  background: rgba(102, 252, 184, 0.1);
  border-color: rgba(102, 252, 184, 0.3);
  color: var(--accent-color);
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.setting-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 60px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.setting-hint {
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.4;
  padding-top: 4px;
  border-top: 1px solid var(--border-color);
}
</style>
