<template>
  <div class="focus-container">
    <div class="section-header">
      <span class="section-title">🎯 专注模式</span>
      <button class="add-btn" @click="showAddForm = !showAddForm">
        <span v-if="!showAddForm">+ 添加规则</span>
        <span v-else>取消</span>
      </button>
    </div>

    <div class="add-form" v-if="showAddForm">
      <div class="form-row">
        <input
          v-model="newRule.process_name"
          type="text"
          class="form-input"
          placeholder="进程名 (如: chrome.exe)"
        />
      </div>
      <div class="form-row time-row">
        <input
          v-model="newRule.start_time"
          type="time"
          class="form-input time-input"
        />
        <span class="time-sep">至</span>
        <input
          v-model="newRule.end_time"
          type="time"
          class="form-input time-input"
        />
      </div>
      <button class="save-btn" @click="handleSave" :disabled="!isFormValid">
        保存规则
      </button>
    </div>

    <div class="rules-list" v-if="rules.length > 0">
      <div
        v-for="rule in rules"
        :key="rule.id"
        class="rule-item"
        :class="{ disabled: !rule.enabled }"
      >
        <div class="rule-left">
          <div class="rule-icon">{{ getIcon(rule.process_name).icon }}</div>
          <div class="rule-info">
            <div class="rule-name">{{ getDisplayName(rule.process_name) }}</div>
            <div class="rule-time">
              {{ rule.start_time }} - {{ rule.end_time }}
            </div>
          </div>
        </div>
        <div class="rule-right">
          <button
            class="toggle-btn"
            :class="{ active: rule.enabled }"
            @click="handleToggle(rule)"
          >
            <div class="toggle-thumb"></div>
          </button>
          <button class="delete-btn" @click="$emit('delete', rule.id)">
            🗑
          </button>
        </div>
      </div>
    </div>

    <div class="rules-empty" v-else-if="!showAddForm">
      <span>暂无规则，点击添加按钮创建</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { getAppIcon } from '../utils/appIcons'

const props = defineProps({
  rules: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['save', 'delete'])

const showAddForm = ref(false)
const newRule = reactive({
  process_name: '',
  start_time: '09:00',
  end_time: '18:00'
})

const isFormValid = computed(() => {
  return (
    newRule.process_name.trim() !== '' &&
    newRule.start_time &&
    newRule.end_time
  )
})

function getIcon(processName) {
  return getAppIcon(processName)
}

function getDisplayName(processName) {
  const iconInfo = getAppIcon(processName)
  if (iconInfo.label !== processName) {
    return iconInfo.label
  }
  return processName.replace(/\.(exe|app|lnk)$/i, '')
}

function handleSave() {
  if (!isFormValid.value) return
  emit('save', {
    process_name: newRule.process_name.trim(),
    start_time: newRule.start_time,
    end_time: newRule.end_time,
    enabled: true
  })
  newRule.process_name = ''
  showAddForm.value = false
}

function handleToggle(rule) {
  emit('save', {
    ...rule,
    enabled: !rule.enabled
  })
}
</script>

<style scoped>
.focus-container {
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

.add-btn {
  background: rgba(102, 252, 184, 0.1);
  border: 1px solid var(--border-color);
  color: var(--accent-color);
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 500;
}

.add-btn:hover {
  background: rgba(102, 252, 184, 0.2);
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  margin-bottom: 10px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-row {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.form-input {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--text-primary);
  font-size: 11px;
  outline: none;
  transition: border-color 0.15s ease;
  flex: 1;
}

.form-input:focus {
  border-color: var(--accent-color);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.time-sep {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.save-btn {
  background: linear-gradient(135deg, var(--accent-color), #4de0a0);
  color: #0f1419;
  border: none;
  border-radius: 6px;
  padding: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 252, 184, 0.3);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  transition: all 0.15s ease;
}

.rule-item.disabled {
  opacity: 0.5;
}

.rule-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.rule-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.rule-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rule-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-time {
  font-size: 10px;
  color: var(--text-muted);
}

.rule-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.toggle-btn {
  width: 32px;
  height: 18px;
  background: var(--bg-primary);
  border-radius: 9px;
  position: relative;
  cursor: pointer;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  padding: 0;
}

.toggle-btn.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
}

.toggle-thumb {
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 1px;
  left: 1px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle-btn.active .toggle-thumb {
  left: 15px;
  background: #0f1419;
}

.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
  opacity: 0.6;
  transition: all 0.15s ease;
}

.delete-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  opacity: 1;
}

.rules-empty {
  text-align: center;
  padding: 12px;
  font-size: 10px;
  color: var(--text-muted);
}
</style>
