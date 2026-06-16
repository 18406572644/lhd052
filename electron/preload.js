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
  getDateAppUsage: (date) => ipcRenderer.invoke('get-date-app-usage', date),
  getHealthDashboard: () => ipcRenderer.invoke('get-health-dashboard'),
  saveBodyMetric: (metric) => ipcRenderer.invoke('save-body-metric', metric),
  getBodyMetric: (date) => ipcRenderer.invoke('get-body-metric', date),
  getBodyMetricsRange: (days) => ipcRenderer.invoke('get-body-metrics-range', days),
  getHealthScatter: (metricType, days) => ipcRenderer.invoke('get-health-scatter', metricType, days),
  getWeeklyHealthReport: () => ipcRenderer.invoke('get-weekly-health-report'),
  getTodayRestReminders: () => ipcRenderer.invoke('get-today-rest-reminders'),
  dismissRestReminder: (reminderId, accepted) => ipcRenderer.invoke('dismiss-rest-reminder', reminderId, accepted),
  getHealthEngineStatus: () => ipcRenderer.invoke('get-health-engine-status'),
  getRestReminderSettings: () => ipcRenderer.invoke('get-rest-reminder-settings'),
  saveRestReminderSettings: (settings) => ipcRenderer.invoke('save-rest-reminder-settings', settings),
  startRestBreak: () => ipcRenderer.invoke('start-rest-break'),
  endRestBreak: () => ipcRenderer.invoke('end-rest-break'),
  skipRestBreak: () => ipcRenderer.invoke('skip-rest-break'),
  getRestBreakStatus: () => ipcRenderer.invoke('get-rest-break-status'),
  onRestReminder: (callback) => {
    ipcRenderer.on('rest-reminder', (_event, data) => callback(data))
  },
  onRestBreakStart: (callback) => {
    ipcRenderer.on('rest-break-start', (_event, data) => callback(data))
  },
  onRestBreakEnd: (callback) => {
    ipcRenderer.on('rest-break-end', (_event, data) => callback(data))
  },
  getAllAppCategories: () => ipcRenderer.invoke('get-all-app-categories'),
  saveAppCategory: (processName, category) => ipcRenderer.invoke('save-app-category', processName, category),
  getDefaultCategories: () => ipcRenderer.invoke('get-default-categories'),
  getCategoryUsageStats: (dateStr) => ipcRenderer.invoke('get-category-usage-stats', dateStr),
  getAppUsageByDate: (date) => ipcRenderer.invoke('get-app-usage-by-date', date),
  getAppDetailByDate: (processName, date) => ipcRenderer.invoke('get-app-detail-by-date', processName, date),
  getSetting: (key, defaultValue) => ipcRenderer.invoke('get-setting', key, defaultValue),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  getWeeklyDailyTotals: () => ipcRenderer.invoke('get-weekly-daily-totals'),
  getWeeklyHeatmapMatrix: () => ipcRenderer.invoke('get-weekly-heatmap-matrix'),
  getWeeklyMatrixHourApps: (weekday, hour) => ipcRenderer.invoke('get-weekly-matrix-hour-apps', weekday, hour),
  getExportData: (startDate, endDate) => ipcRenderer.invoke('get-export-data', startDate, endDate),
  getUsageLogs: (startDate, endDate) => ipcRenderer.invoke('get-usage-logs', startDate, endDate),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  saveFile: (filePath, content, encoding) => ipcRenderer.invoke('save-file', filePath, content, encoding),
  onOpenExportDialog: (callback) => {
    ipcRenderer.on('open-export-dialog', (_event, format) => callback(format))
  }
})
