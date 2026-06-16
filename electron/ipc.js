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
  getDateAppUsage
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

function sendMiniWindowUpdate(data) {
  if (miniWindowRef && miniWindowRef.webContents && !miniWindowRef.isDestroyed()) {
    miniWindowRef.webContents.send('mini-window-update', data)
  }
}

module.exports = {
  registerIpcHandlers,
  sendUsageUpdate,
  sendFocusAlert,
  sendMiniWindowUpdate,
  setMiniWindowRef,
  setMainModule
}
