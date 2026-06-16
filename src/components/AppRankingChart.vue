<template>
  <div class="chart-container">
    <div class="section-header">
      <span class="section-title">应用使用排行</span>
      <span class="section-count">{{ appUsage.length }} 个应用</span>
    </div>
    <div class="view-tabs">
      <button
        class="view-tab-btn"
        :class="{ active: viewMode === 'all' }"
        @click="viewMode = 'all'"
      >
        全部应用
      </button>
      <button
        class="view-tab-btn"
        :class="{ active: viewMode === 'category' }"
        @click="viewMode = 'category'"
      >
        按分类排行
      </button>
    </div>
    <div class="chart-list" v-if="viewMode === 'all' && appUsage.length > 0">
      <div
        v-for="(item, index) in displayData"
        :key="item.process_name"
        class="chart-item"
      >
        <div class="item-left">
          <div class="item-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</div>
          <div class="item-icon">{{ getIcon(item.process_name).icon }}</div>
          <div class="item-info">
            <div class="item-name">{{ getDisplayName(item.process_name) }}</div>
            <div class="item-duration">{{ formatDurationShort(item.total_duration) }}</div>
          </div>
        </div>
        <div class="item-right">
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{ width: getBarWidth(item.total_duration) + '%' }"
            ></div>
          </div>
          <div class="item-percent">{{ getPercent(item.total_duration) }}%</div>
        </div>
        <div class="item-category-selector">
          <select
            class="category-select"
            :value="appCategories[item.process_name] || '其他'"
            @change="handleCategoryChange(item.process_name, $event.target.value)"
          >
            <option v-for="cat in defaultCategories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
      </div>
    </div>
    <div class="category-view" v-else-if="viewMode === 'category' && categoryStats.length > 0">
      <div class="doughnut-chart-wrapper">
        <Doughnut :data="doughnutData" :options="doughnutOptions" />
      </div>
      <div class="category-list">
        <div
          v-for="(cat, idx) in categoryStats"
          :key="cat.category"
          class="category-item"
        >
          <div class="category-header" @click="toggleCategoryExpand(cat.category)">
            <div class="category-left">
              <div
                class="category-color"
                :style="{ backgroundColor: getCategoryColor(idx) }"
              ></div>
              <span class="category-name">{{ cat.category }}</span>
              <span class="category-app-count">({{ cat.app_count }} 个应用)</span>
            </div>
            <div class="category-right">
              <span class="category-duration">{{ formatDurationShort(cat.total_duration) }}</span>
              <span class="category-percent">{{ getCategoryPercent(cat.total_duration) }}%</span>
              <span class="expand-icon">{{ expandedCategory === cat.category ? '▲' : '▼' }}</span>
            </div>
          </div>
          <div class="category-apps" v-if="expandedCategory === cat.category">
            <div
              v-for="(app, appIdx) in cat.apps.slice(0, 8)"
              :key="app.process_name"
              class="category-app-row"
            >
              <div class="app-row-left">
                <span class="app-row-icon">{{ getIcon(app.process_name).icon }}</span>
                <span class="app-row-name">{{ getDisplayName(app.process_name) }}</span>
              </div>
              <div class="app-row-right">
                <span class="app-row-duration">{{ formatDurationShort(app.total_duration) }}</span>
                <select
                  class="category-select mini"
                  :value="appCategories[app.process_name] || '其他'"
                  @change="handleCategoryChange(app.process_name, $event.target.value)"
                >
                  <option v-for="cat2 in defaultCategories" :key="cat2" :value="cat2">{{ cat2 }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="empty-state" v-else>
      <div class="empty-icon">📊</div>
      <div class="empty-text">暂无数据</div>
      <div class="empty-hint">开始使用应用后将显示统计</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { getAppIcon, formatDurationShort } from '../utils/appIcons'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  appUsage: {
    type: Array,
    default: () => []
  },
  categoryStats: {
    type: Array,
    default: () => []
  },
  selectedDate: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update-category', 'refresh'])

const viewMode = ref('all')
const appCategories = ref({})
const defaultCategories = ref(['工作', '社交通讯', '娱乐', '学习', '其他'])
const expandedCategory = ref(null)

const CATEGORY_COLORS = [
  '#66fcb8',
  '#4de0a0',
  '#ff9f43',
  '#54a0ff',
  '#c8d6e5',
  '#ff6b6b',
  '#a29bfe',
  '#fdcb6e'
]

const maxDuration = computed(() => {
  if (props.appUsage.length === 0) return 1
  return Math.max(...props.appUsage.map(i => i.total_duration))
})

const totalDuration = computed(() => {
  return props.appUsage.reduce((sum, i) => sum + i.total_duration, 0) || 1
})

const categoryTotalDuration = computed(() => {
  return props.categoryStats.reduce((sum, c) => sum + c.total_duration, 0) || 1
})

const displayData = computed(() => {
  return props.appUsage.slice(0, 6)
})

const doughnutData = computed(() => {
  return {
    labels: props.categoryStats.map(c => c.category),
    datasets: [{
      data: props.categoryStats.map(c => c.total_duration),
      backgroundColor: props.categoryStats.map((_, i) => getCategoryColor(i)),
      borderWidth: 0,
      hoverOffset: 6
    }]
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(26, 26, 46, 0.95)',
      titleColor: '#fff',
      bodyColor: '#ddd',
      borderColor: 'rgba(102, 252, 184, 0.3)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
      callbacks: {
        label: (context) => {
          const val = context.raw
          const ms = val
          const totalSeconds = Math.floor(ms / 1000)
          const hours = Math.floor(totalSeconds / 3600)
          const minutes = Math.floor((totalSeconds % 3600) / 60)
          let timeStr = ''
          if (hours > 0) timeStr += `${hours}h${minutes}m`
          else timeStr += `${minutes}m`
          return ` ${timeStr}`
        }
      }
    }
  }
}

function getCategoryColor(index) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length]
}

function getIcon(processName) {
  return getAppIcon(processName)
}

function getDisplayName(processName) {
  const iconInfo = getAppIcon(processName)
  if (iconInfo.label !== processName) {
    return iconInfo.label
  }
  const name = processName.replace(/\.(exe|app|lnk|bat|cmd)$/i, '')
  if (name.length > 10) {
    return name.slice(0, 8) + '...'
  }
  return name
}

function getBarWidth(duration) {
  return (duration / maxDuration.value) * 100
}

function getPercent(duration) {
  return Math.round((duration / totalDuration.value) * 100)
}

function getCategoryPercent(duration) {
  return Math.round((duration / categoryTotalDuration.value) * 100)
}

function toggleCategoryExpand(category) {
  if (expandedCategory.value === category) {
    expandedCategory.value = null
  } else {
    expandedCategory.value = category
  }
}

async function handleCategoryChange(processName, category) {
  try {
    await window.electronAPI.saveAppCategory(processName, category)
    appCategories.value[processName] = category
    emit('update-category', processName, category)
  } catch (e) {
    console.error('保存分类失败:', e)
  }
}

async function loadCategories() {
  try {
    appCategories.value = await window.electronAPI.getAllAppCategories()
    const cats = await window.electronAPI.getDefaultCategories()
    if (cats && cats.length > 0) {
      defaultCategories.value = cats
    }
  } catch (e) {
    console.error('加载分类失败:', e)
  }
}

watch(() => props.appUsage, () => {
  loadCategories()
}, { deep: true })

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.chart-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  min-height: 220px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-count {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 8px;
}

.view-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  flex-shrink: 0;
  background: var(--bg-tertiary);
  padding: 3px;
  border-radius: 8px;
}

.view-tab-btn {
  flex: 1;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-tab-btn.active {
  background: var(--accent-color);
  color: #1a1a2e;
  font-weight: 600;
}

.view-tab-btn:hover:not(.active) {
  color: var(--text-secondary);
}

.chart-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 110px;
  flex-shrink: 0;
}

.item-rank {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  flex-shrink: 0;
}

.item-rank.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffa500);
  color: #1a1a2e;
}

.item-rank.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #1a1a2e;
}

.item-rank.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  color: #fff;
}

.item-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-duration {
  font-size: 10px;
  color: var(--accent-color);
  font-weight: 600;
}

.item-right {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bar-track {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
  min-width: 40px;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color), #4de0a0);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.item-percent {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
  min-width: 30px;
  text-align: right;
}

.item-category-selector {
  flex-shrink: 0;
}

.category-select {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 10px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  max-width: 80px;
}

.category-select.mini {
  padding: 2px 6px;
  font-size: 9px;
  max-width: 70px;
}

.category-select:hover {
  border-color: var(--accent-color);
}

.category-select:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(102, 252, 184, 0.15);
}

.category-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.doughnut-chart-wrapper {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.category-item {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.category-header:hover {
  background: rgba(102, 252, 184, 0.05);
}

.category-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-color {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

.category-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.category-app-count {
  font-size: 10px;
  color: var(--text-muted);
}

.category-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-duration {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-color);
}

.category-percent {
  font-size: 10px;
  color: var(--text-muted);
  min-width: 28px;
  text-align: right;
}

.expand-icon {
  font-size: 9px;
  color: var(--text-muted);
  width: 14px;
  text-align: center;
}

.category-apps {
  border-top: 1px solid var(--border-color);
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.15);
}

.category-app-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.app-row-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.app-row-icon {
  font-size: 13px;
  flex-shrink: 0;
}

.app-row-name {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-row-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.app-row-duration {
  font-size: 10px;
  color: var(--accent-color);
  font-weight: 500;
  min-width: 36px;
  text-align: right;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.empty-icon {
  font-size: 28px;
  opacity: 0.5;
}

.empty-text {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.empty-hint {
  font-size: 10px;
  color: var(--text-muted);
}
</style>
