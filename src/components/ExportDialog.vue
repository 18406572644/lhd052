<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal-content export-dialog">
        <div class="modal-header">
          <span class="modal-title">导出数据</span>
          <button class="modal-close" @click="handleClose">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-section">
            <label class="section-label">导出格式</label>
            <div class="format-options">
              <button
                v-for="fmt in formatOptions"
                :key="fmt.value"
                class="format-btn"
                :class="{ active: selectedFormat === fmt.value }"
                @click="selectedFormat = fmt.value"
              >
                <span class="format-icon">{{ fmt.icon }}</span>
                <span class="format-name">{{ fmt.label }}</span>
                <span class="format-desc">{{ fmt.description }}</span>
              </button>
            </div>
          </div>

          <div class="form-section">
            <label class="section-label">导出范围</label>
            <div class="range-options">
              <button
                v-for="rng in rangeOptions"
                :key="rng.value"
                class="range-btn"
                :class="{ active: selectedRange === rng.value }"
                @click="handleRangeSelect(rng.value)"
              >
                {{ rng.label }}
              </button>
            </div>
            
            <div v-if="selectedRange === 'custom'" class="custom-range">
              <div class="date-input-group">
                <label>开始日期</label>
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate"
                  class="date-input"
                />
              </div>
              <div class="date-input-group">
                <label>结束日期</label>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="today"
                  class="date-input"
                />
              </div>
            </div>
          </div>

          <div v-if="exporting" class="export-progress">
            <div class="progress-spinner"></div>
            <span class="progress-text">{{ progressText }}</span>
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div v-if="successMessage" class="success-message">
            {{ successMessage }}
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="handleClose" :disabled="exporting">
            取消
          </button>
          <button class="btn btn-primary" @click="handleExport" :disabled="exporting || !canExport">
            {{ exporting ? '导出中...' : '开始导出' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <ExportReportCard
    ref="reportCardRef"
    :exportData="exportData"
    :isHidden="!showReportCard"
  />
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import ExportReportCard from './ExportReportCard.vue'
import {
  exportCSV,
  exportJSON,
  getDateRange,
  getDefaultFileName,
  formatDate
} from '../utils/exportUtils'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  defaultFormat: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close'])

const selectedFormat = ref('csv')
const selectedRange = ref('today')
const customStartDate = ref(formatDate(new Date()))
const customEndDate = ref(formatDate(new Date()))
const exporting = ref(false)
const progressText = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const exportData = ref({})
const showReportCard = ref(false)
const reportCardRef = ref(null)

const today = computed(() => formatDate(new Date()))

const formatOptions = [
  { value: 'csv', icon: '📄', label: 'CSV', description: '明细数据，Excel 兼容' },
  { value: 'json', icon: '📋', label: 'JSON', description: '结构化数据，包含分类汇总' },
  { value: 'png', icon: '🖼️', label: 'PNG 报告', description: '可视化报告卡片图片' }
]

const rangeOptions = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '近 7 天' },
  { value: 'month', label: '近 30 天' },
  { value: 'custom', label: '自定义范围' }
]

const canExport = computed(() => {
  if (selectedRange.value === 'custom') {
    return customStartDate.value && customEndDate.value && 
           customStartDate.value <= customEndDate.value
  }
  return true
})

watch(() => props.visible, (val) => {
  if (val) {
    resetState()
    if (props.defaultFormat) {
      selectedFormat.value = props.defaultFormat
    }
  }
})

watch(() => props.defaultFormat, (val) => {
  if (val && props.visible) {
    selectedFormat.value = val
  }
})

function resetState() {
  errorMessage.value = ''
  successMessage.value = ''
  exporting.value = false
  progressText.value = ''
  showReportCard.value = false
  exportData.value = {}
}

function handleRangeSelect(range) {
  selectedRange.value = range
  if (range !== 'custom') {
    const { startDate, endDate } = getDateRange(range)
    customStartDate.value = startDate
    customEndDate.value = endDate
  }
}

async function handleExport() {
  if (!canExport.value) return
  
  exporting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    let result
    
    switch (selectedFormat.value) {
      case 'csv':
        progressText.value = '正在生成 CSV 文件...'
        result = await exportCSV(selectedRange.value, customStartDate.value, customEndDate.value)
        break
      case 'json':
        progressText.value = '正在生成 JSON 文件...'
        result = await exportJSON(selectedRange.value, customStartDate.value, customEndDate.value)
        break
      case 'png':
        result = await exportPNG()
        break
      default:
        throw new Error('不支持的导出格式')
    }
    
    if (result.canceled) {
      exporting.value = false
      return
    }
    
    if (result.success) {
      successMessage.value = `导出成功！文件已保存至：${result.filePath}`
      setTimeout(() => {
        handleClose()
      }, 2000)
    } else {
      throw new Error(result.error || '导出失败')
    }
  } catch (error) {
    errorMessage.value = error.message || '导出失败，请重试'
  } finally {
    exporting.value = false
    progressText.value = ''
    showReportCard.value = false
  }
}

async function exportPNG() {
  progressText.value = '正在加载数据...'
  
  const { startDate, endDate } = getDateRange(selectedRange.value, customStartDate.value, customEndDate.value)
  const data = await window.electronAPI.getExportData(startDate, endDate)
  
  if (!data || Object.keys(data.dailyData || {}).length === 0) {
    return { success: false, error: '该日期范围内没有数据' }
  }
  
  exportData.value = data
  showReportCard.value = true
  
  await nextTick()
  
  if (reportCardRef.value) {
    reportCardRef.value.renderDoughnutChart()
  }
  
  await new Promise(resolve => setTimeout(resolve, 500))
  
  progressText.value = '正在生成报告图片...'
  
  if (!reportCardRef.value) {
    throw new Error('报告模板未初始化')
  }
  
  const dataUrl = await reportCardRef.value.captureCard()
  
  if (!dataUrl) {
    throw new Error('生成图片失败')
  }
  
  const base64Data = dataUrl.split(',')[1]
  const fileName = getDefaultFileName('png', startDate, endDate)
  
  progressText.value = '正在保存文件...'
  
  const result = await window.electronAPI.showSaveDialog({
    title: '导出 PNG 报告',
    defaultPath: fileName,
    filters: [
      { name: 'PNG 图片', extensions: ['png'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  
  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }
  
  const saveResult = await window.electronAPI.saveFile(result.filePath, base64Data, 'base64')
  return saveResult
}

function handleClose() {
  if (!exporting.value) {
    emit('close')
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  min-width: 380px;
  max-width: 90vw;
  overflow: hidden;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(180deg, rgba(102, 252, 184, 0.05) 0%, transparent 100%);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 22px;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.format-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.format-btn:hover {
  background: rgba(102, 252, 184, 0.05);
}

.format-btn.active {
  border-color: var(--accent-color);
  background: rgba(102, 252, 184, 0.08);
}

.format-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.format-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
  min-width: 80px;
}

.format-desc {
  font-size: 11px;
  color: var(--text-muted);
  flex: 1;
}

.range-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.range-btn {
  padding: 10px 8px;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.range-btn:hover {
  background: rgba(102, 252, 184, 0.05);
  color: var(--text-primary);
}

.range-btn.active {
  border-color: var(--accent-color);
  background: rgba(102, 252, 184, 0.08);
  color: var(--accent-color);
}

.custom-range {
  display: flex;
  gap: 12px;
  padding-top: 4px;
}

.date-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-input-group label {
  font-size: 10px;
  color: var(--text-muted);
}

.date-input {
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-input:hover,
.date-input:focus {
  border-color: var(--accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(102, 252, 184, 0.1);
}

.export-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(102, 252, 184, 0.08);
  border-radius: 8px;
}

.progress-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(102, 252, 184, 0.2);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-text {
  font-size: 12px;
  color: var(--accent-color);
  font-weight: 500;
}

.error-message {
  padding: 12px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  font-size: 12px;
  color: #ff6b6b;
}

.success-message {
  padding: 12px;
  background: rgba(102, 252, 184, 0.1);
  border: 1px solid rgba(102, 252, 184, 0.3);
  border-radius: 8px;
  font-size: 12px;
  color: var(--accent-color);
  word-break: break-all;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.1);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border-color);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--accent-color);
  color: #1a1a2e;
}

.btn-primary:hover:not(:disabled) {
  background: #4de0a0;
  box-shadow: 0 4px 12px rgba(102, 252, 184, 0.3);
}
</style>
