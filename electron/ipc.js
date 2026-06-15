const { ipcMain, BrowserWindow } = require('electron')
const {
  getTodayAppUsage,
  getTodayTotalTime,
  getHourlyHeatmap,
  getFocusRules,
  saveFocusRule,
  deleteFocusRule
} = require('./database')

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

  ipcMain.handle('save-focus-rule', (_event, rule) => {
    return saveFocusRule(rule)
  })

  ipcMain.handle('delete-focus-rule', (_event, id) => {
    return deleteFocusRule(id)
  })

  ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.on('window-close', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.hide()
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

module.exports = {
  registerIpcHandlers,
  sendUsageUpdate,
  sendFocusAlert
}
