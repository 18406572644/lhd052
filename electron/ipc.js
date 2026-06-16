const { ipcMain, BrowserWindow } = require('electron')
const {
  getTodayAppUsage,
  getTodayTotalTime,
  getHourlyHeatmap,
  getFocusRules,
  saveFocusRule,
  deleteFocusRule,
  getDailyInsights,
  getDateRangeHeatmap,
  getHourlyAppUsage,
  getDailyHeatmapByDate,
  getDateAppUsage,
  getAppUsageByDate,
  getAppDetailByDate,
  insertBodyMetric,
  getBodyMetricByDate,
  getBodyMetricsRange,
  insertRestReminder,
  updateRestReminder,
  getTodayRestReminders,
  getHealthDashboardData,
  getHealthScatterData,
  getWeeklyHealthReport,
  insertAfkSession,
  getTodayAfkSessions,
  getAllAppCategories,
  saveAppCategory,
  getDefaultCategoriesList,
  getCategoryUsageStats,
  getSetting,
  setSetting
} = require('./database')

let miniWindowRef = null
let mainModule = null

function setMiniWindowRef(win) {
  miniWindowRef = win
}

function setMainModule(mod) {
  mainModule = mod
}

function registerIpcHandlers() {
  ipcMain.handle('get-today-app-usage', () => {
    return getTodayAppUsage()
  })

  ipcMain.handle('get-today-total-time', () => {
    return getTodayTotalTime()
  })

  ipcMain.handle('get-hourly-heatmap', () => {
    return getHourlyHeatmap()
  })

  ipcMain.handle('get-focus-rules', () => {
    return getFocusRules()
  })

  ipcMain.handle('get-daily-insights', () => {
    return getDailyInsights()
  })

  ipcMain.handle('get-date-range-heatmap', (_event, range) => {
    return getDateRangeHeatmap(range)
  })

  ipcMain.handle('get-hourly-app-usage', (_event, date, hour) => {
    return getHourlyAppUsage(date, hour)
  })

  ipcMain.handle('get-daily-heatmap-by-date', (_event, date) => {
    return getDailyHeatmapByDate(date)
  })

  ipcMain.handle('get-date-app-usage', (_event, date) => {
    return getDateAppUsage(date)
  })

  ipcMain.handle('get-health-dashboard', () => {
    return getHealthDashboardData()
  })

  ipcMain.handle('save-body-metric', (_event, metric) => {
    return insertBodyMetric(metric)
  })

  ipcMain.handle('get-body-metric', (_event, date) => {
    return getBodyMetricByDate(date)
  })

  ipcMain.handle('get-body-metrics-range', (_event, days) => {
    return getBodyMetricsRange(days)
  })

  ipcMain.handle('get-health-scatter', (_event, metricType, days) => {
    return getHealthScatterData(metricType, days)
  })

  ipcMain.handle('get-weekly-health-report', () => {
    return getWeeklyHealthReport()
  })

  ipcMain.handle('get-today-rest-reminders', () => {
    return getTodayRestReminders()
  })

  ipcMain.handle('dismiss-rest-reminder', (_event, reminderId, accepted) => {
    const { dismissRestReminder } = require('./health-engine')
    dismissRestReminder(accepted)
    return true
  })

  ipcMain.handle('get-health-engine-status', () => {
    const { getHealthEngineStatus } = require('./health-engine')
    return getHealthEngineStatus()
  })

  ipcMain.handle('get-rest-reminder-settings', () => {
    const { getRestReminderSettings } = require('./health-engine')
    return getRestReminderSettings()
  })

  ipcMain.handle('save-rest-reminder-settings', (_event, settings) => {
    const { updateSettings } = require('./health-engine')
    return updateSettings(settings)
  })

  ipcMain.handle('start-rest-break', () => {
    const { startRestBreak } = require('./health-engine')
    startRestBreak()
    return true
  })

  ipcMain.handle('end-rest-break', () => {
    const { endRestBreak } = require('./health-engine')
    endRestBreak()
    return true
  })

  ipcMain.handle('skip-rest-break', () => {
    const { skipRestBreak } = require('./health-engine')
    skipRestBreak()
    return true
  })

  ipcMain.handle('get-rest-break-status', () => {
    const { getRestBreakStatus } = require('./health-engine')
    return getRestBreakStatus()
  })

  ipcMain.handle('save-focus-rule', (_event, rule) => {
    const result = saveFocusRule(rule)
    if (miniWindowRef && miniWindowRef.webContents) {
      const mainWindow = mainModule && mainModule.getMainWindow ? mainModule.getMainWindow() : null
      if (mainModule && typeof mainModule.updateMiniWindowData === 'function') {
        mainModule.updateMiniWindowData()
      }
    }
    return result
  })

  ipcMain.handle('delete-focus-rule', (_event, id) => {
    deleteFocusRule(id)
    if (mainModule && typeof mainModule.updateMiniWindowData === 'function') {
      mainModule.updateMiniWindowData()
    }
  })

  ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.on('window-close', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.hide()
  })

  ipcMain.on('mini-window-switch-to-main', () => {
    if (mainModule && typeof mainModule.switchToMainWindow === 'function') {
      mainModule.switchToMainWindow()
    }
  })

  ipcMain.handle('mini-window-get-initial-data', () => {
    const totalTime = getTodayTotalTime()
    const focusRules = getFocusRules()
    const appUsage = getTodayAppUsage()
    
    let currentApp = null
    if (mainModule && typeof mainModule.getCurrentWindow === 'function') {
      const currentWindow = mainModule.getCurrentWindow()
      if (currentWindow) {
        const app = appUsage.find(a => 
          a.process_name.toLowerCase() === currentWindow.processName.toLowerCase()
        )
        currentApp = {
          processName: currentWindow.processName,
          windowTitle: currentWindow.windowTitle,
          duration: app ? app.total_duration : 0
        }
      }
    }

    return {
      totalTime,
      currentApp,
      focusRules
    }
  })

  ipcMain.handle('get-all-app-categories', () => {
    return getAllAppCategories()
  })

  ipcMain.handle('save-app-category', (_event, processName, category) => {
    saveAppCategory(processName, category)
    return true
  })

  ipcMain.handle('get-default-categories', () => {
    return getDefaultCategoriesList()
  })

  ipcMain.handle('get-category-usage-stats', (_event, dateStr) => {
    return getCategoryUsageStats(dateStr)
  })

  ipcMain.handle('get-app-usage-by-date', (_event, date) => {
    return getAppUsageByDate(date)
  })

  ipcMain.handle('get-app-detail-by-date', (_event, processName, date) => {
    return getAppDetailByDate(processName, date)
  })

  ipcMain.handle('get-setting', (_event, key, defaultValue) => {
    return getSetting(key, defaultValue)
  })

  ipcMain.handle('set-setting', (_event, key, value) => {
    setSetting(key, value)
    return true
  })
}

function sendUsageUpdate(data) {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(win => {
    win.webContents.send('usage-updated', data)
  })
}

function sendFocusAlert(data) {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(win => {
    win.webContents.send('focus-alert', data)
    if (!win.isVisible()) {
      win.show()
    }
    win.focus()
  })
}

function sendRestReminder(data) {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(win => {
    win.webContents.send('rest-reminder', data)
    if (!win.isVisible()) {
      win.show()
    }
    win.focus()
  })
}

function sendRestBreakStart(data) {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(win => {
    win.webContents.send('rest-break-start', data)
    if (!win.isVisible()) {
      win.show()
    }
    win.focus()
  })
}

function sendRestBreakEnd(data) {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(win => {
    win.webContents.send('rest-break-end', data)
  })
}

function sendMiniWindowUpdate(data) {
  if (miniWindowRef && miniWindowRef.webContents && !miniWindowRef.isDestroyed()) {
    miniWindowRef.webContents.send('mini-window-update', data)
  }
}

module.exports = {
  registerIpcHandlers,
  sendUsageUpdate,
  sendFocusAlert,
  sendRestReminder,
  sendRestBreakStart,
  sendRestBreakEnd,
  sendMiniWindowUpdate,
  setMiniWindowRef,
  setMainModule
}
