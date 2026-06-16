<template>
  <div class="insights-card">
    <div class="insights-header">
      <span class="insights-label">今日洞察</span>
      <span class="insights-count" v-if="displayInsights.length > 0">
        {{ currentIndex + 1 }} / {{ displayInsights.length }}
      </span>
    </div>
    <div class="insights-content" v-if="displayInsights.length > 0">
      <transition name="slide-fade" mode="out-in">
        <div :key="currentIndex" class="insight-item">
          <div class="insight-icon">{{ displayInsights[currentIndex].icon }}</div>
          <div class="insight-text">
            <div class="insight-title">{{ displayInsights[currentIndex].title }}</div>
            <div class="insight-message">{{ displayInsights[currentIndex].message }}</div>
          </div>
        </div>
      </transition>
    </div>
    <div class="insights-empty" v-else>
      <span class="empty-icon">✨</span>
      <span class="empty-text">暂无洞察数据，继续使用以生成更多分析</span>
    </div>
    <div class="insights-dots" v-if="displayInsights.length > 1">
      <span
        v-for="(_, index) in displayInsights"
        :key="index"
        class="dot"
        :class="{ active: index === currentIndex }"
        @click="goToSlide(index)"
      ></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  insights: {
    type: Array,
    default: () => []
  }
})

const currentIndex = ref(0)
let autoPlayTimer = null

const displayInsights = computed(() => {
  if (props.insights.length <= 3) return props.insights
  const today = new Date().toDateString()
  const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const shuffled = [...props.insights]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed + i) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 3)
})

function goToSlide(index) {
  currentIndex.value = index
  resetAutoPlay()
}

function nextSlide() {
  if (displayInsights.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % displayInsights.value.length
}

function startAutoPlay() {
  if (displayInsights.value.length <= 1) return
  autoPlayTimer = setInterval(() => {
    nextSlide()
  }, 5000)
}

function resetAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
  }
  startAutoPlay()
}

watch(displayInsights, () => {
  currentIndex.value = 0
  resetAutoPlay()
})

onMounted(() => {
  startAutoPlay()
})

onUnmounted(() => {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
  }
})
</script>

<style scoped>
.insights-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  flex-shrink: 0;
}

.insights-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.insights-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.insights-count {
  font-size: 10px;
  color: var(--text-muted);
}

.insights-content {
  min-height: 60px;
}

.insight-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.insight-icon {
  font-size: 20px;
  flex-shrink: 0;
  line-height: 1.3;
}

.insight-text {
  flex: 1;
  min-width: 0;
}

.insight-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.insight-message {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.insights-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.empty-icon {
  font-size: 18px;
}

.empty-text {
  font-size: 11px;
  color: var(--text-muted);
}

.insights-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.dot.active {
  background: linear-gradient(90deg, #8b5cf6, #6366f1);
  width: 18px;
  border-radius: 3px;
}

.slide-fade-enter-active {
  transition: all 0.4s ease;
}

.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
