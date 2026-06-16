const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getTodayAppUsage: () => ipcRenderer.invoke('get-today-app-usage'),
  getTodayTotalTime: () => ipcRenderer.invoke('get-today-total-time'),
  getHourlyHeatmap: () => ipcRenderer.invoke('get-hourly-heatmap'),
  getFocusRules: () => ipcRenderer.invoke('get-focus-rules'),
  getDailyInsights: () => ipcRenderer.invoke('get-daily-insights'),
  saveFocusRule: (rule) => ipcRenderer.invoke('save-focus-rule', rule),
  deleteFocusRule: (id) => ipcRenderer.invoke('delete-focus-rule', id),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onUsageUpdated: (callback) => {
    ipcRenderer.on('usage-updated', (_event, data) => callback(data))
  },
  onFocusAlert: (callback) => {
    ipcRenderer.on('focus-alert', (_event, data) => callback(data))
  },
  getDateRangeHeatmap: (range) => ipcRenderer.invoke('get-date-range-heatmap', range),
  getHourlyAppUsage: (date, hour) => ipcRenderer.invoke('get-hourly-app-usage', date, hour),
  getDailyHeatmapByDate: (date) => ipcRenderer.invoke('get-daily-heatmap-by-date', date),
  getDateAppUsage: (date) => ipcRenderer.invoke('get-date-app-usage', date)
})
