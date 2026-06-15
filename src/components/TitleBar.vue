<template>
  <div class="title-bar">
    <div class="title-bar-left" style="-webkit-app-region: drag;">
      <div class="app-icon">⏱</div>
      <span class="app-title">屏幕使用时间</span>
    </div>
    <div class="title-bar-right">
      <button class="window-btn minimize-btn" @click="$emit('minimize')" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="5.5" width="8" height="1.2" rx="0.6" fill="currentColor"/>
        </svg>
      </button>
      <button class="resize-handle" title="拖拽调整大小"></button>
      <button class="window-btn close-btn" @click="$emit('close')" title="隐藏窗口">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['minimize', 'close'])
</script>

<style scoped>
.title-bar {
  height: 38px;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 0 14px;
  background: linear-gradient(180deg, rgba(102, 252, 184, 0.06) 0%, transparent 100%);
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
  position: relative;
  z-index: 10;
}

.title-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  height: 100%;
}

.app-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent-color), #4de0a0);
  border-radius: 6px;
  font-size: 11px;
  flex-shrink: 0;
}

.app-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.title-bar-right {
  display: flex;
  align-items: center;
  gap: 2px;
  -webkit-app-region: no-drag;
  height: 100%;
}

.window-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.window-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.close-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  color: var(--danger-color);
}

.resize-handle {
  width: 16px;
  height: 28px;
  cursor: nesw-resize;
  background: transparent;
  border: none;
  position: relative;
}

.resize-handle::after {
  content: '';
  position: absolute;
  top: 6px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-top: 1.5px solid var(--text-muted);
  border-right: 1.5px solid var(--text-muted);
  border-radius: 0 2px 0 0;
  opacity: 0.5;
}

.resize-handle:hover::after {
  border-color: var(--accent-color);
  opacity: 1;
}
</style>
