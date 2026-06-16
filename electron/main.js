const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } = require('electron')
const path = require('path')
const { initDatabase, getTodayTotalTime, getTodayAppUsage, getFocusRules } = require('./database')
const { registerIpcHandlers, sendMiniWindowUpdate, setMiniWindowRef, setMainModule } = require('./ipc')
const { startTracker, stopTracker, getCurrentWindow, setHealthEngine } = require('./tracker')
const healthEngine = require('./health-engine')

let mainWindow = null
let miniWindow = null
let tray = null
let isMiniMode = false
let miniUpdateInterval = null

const isDev = process.env.NODE_ENV === 'development'

const MINI_WINDOW_WIDTH = 160
const MINI_WINDOW_HEIGHT = 80

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 300,
    height: 500,
    minWidth: 280,
    minHeight: 400,
    frame: false,
    transparent: true,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    hasShadow: true,
    backgroundColor: '#00000000',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createMiniWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { workArea } = primaryDisplay
  const x = workArea.x + workArea.width - MINI_WINDOW_WIDTH - 20
  const y = workArea.y + workArea.height - MINI_WINDOW_HEIGHT - 20

  miniWindow = new BrowserWindow({
    width: MINI_WINDOW_WIDTH,
    height: MINI_WINDOW_HEIGHT,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    backgroundColor: '#00000000',
    movable: true,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      sandbox: false
    }
  })

  miniWindow.setAlwaysOnTop(true, 'screen-saver')
  miniWindow.setVisibleOnAllWorkspaces(true)

  miniWindow.loadFile(path.join(__dirname, 'mini-window.html'))

  miniWindow.on('closed', () => {
    miniWindow = null
    setMiniWindowRef(null)
    if (miniUpdateInterval) {
      clearInterval(miniUpdateInterval)
      miniUpdateInterval = null
    }
  })

  miniWindow.webContents.on('did-finish-load', () => {
    updateMiniWindowData()
  })

  setMiniWindowRef(miniWindow)

  if (!miniUpdateInterval) {
    miniUpdateInterval = setInterval(() => {
      if (miniWindow && miniWindow.isVisible()) {
        updateMiniWindowData()
      }
    }, 5000)
  }
}

function toggleMiniMode() {
  isMiniMode = !isMiniMode

  if (isMiniMode) {
    if (!miniWindow) {
      createMiniWindow()
    } else {
      miniWindow.show()
    }
    if (mainWindow) {
      mainWindow.hide()
    }
  } else {
    if (miniWindow) {
      miniWindow.hide()
    }
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  }

  updateTrayMenu()
}

function switchToMainWindow() {
  if (isMiniMode) {
    toggleMiniMode()
  } else {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  }
}

function getCurrentAppDuration(processName) {
  if (!processName) return 0
  const appUsage = getTodayAppUsage()
  const app = appUsage.find(a => a.process_name.toLowerCase() === processName.toLowerCase())
  return app ? app.total_duration : 0
}

function updateMiniWindowData() {
  if (!miniWindow || !miniWindow.webContents) return

  const totalTime = getTodayTotalTime()
  const currentWindow = getCurrentWindow()
  const focusRules = getFocusRules()

  let currentApp = null
  if (currentWindow) {
    const duration = getCurrentAppDuration(currentWindow.processName)
    currentApp = {
      processName: currentWindow.processName,
      windowTitle: currentWindow.windowTitle,
      duration: duration
    }
  }

  sendMiniWindowUpdate({
    totalTime,
    currentApp,
    focusRules
  })
}

function createTray() {
  const icon = nativeImage.createEmpty()
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const x = i % size
    const y = Math.floor(i / size)
    const cx = size / 2
    const cy = size / 2
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    const idx = i * 4
    if (dist < size / 2 - 1) {
      canvas[idx] = 102
      canvas[idx + 1] = 252
      canvas[idx + 2] = 184
      canvas[idx + 3] = 255
    } else {
      canvas[idx + 3] = 0
    }
  }
  const trayIcon = nativeImage.createFromBuffer(canvas, { width: size, height: size })

  tray = new Tray(trayIcon)
  tray.setToolTip('屏幕使用时间统计')

  updateTrayMenu()

  tray.on('click', () => {
    if (isMiniMode) {
      toggleMiniMode()
    } else {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      } else {
        createWindow()
      }
    }
  })
}

function updateTrayMenu() {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isMiniMode ? '显示主窗口' : '迷你模式',
      click: () => {
        toggleMiniMode()
      }
    },
    { type: 'separator' },
    {
      label: '显示主窗口',
      visible: isMiniMode,
      click: () => {
        switchToMainWindow()
      }
    },
    {
      label: '开机自启',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          path: process.execPath
        })
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        stopTracker()
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  setMainModule(module.exports)
  createWindow()
  createTray()
  startTracker()
  setHealthEngine(healthEngine)
  healthEngine.startHealthEngine()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', (e) => {
  e.preventDefault()
  if (isMiniMode && miniWindow) {
    return
  }
  if (mainWindow) {
    mainWindow.hide()
  }
})

app.on('before-quit', () => {
  stopTracker()
  healthEngine.stopHealthEngine()
  if (miniUpdateInterval) {
    clearInterval(miniUpdateInterval)
    miniUpdateInterval = null
  }
})

module.exports = {
  getMainWindow: () => mainWindow,
  getMiniWindow: () => miniWindow,
  getCurrentWindow,
  toggleMiniMode,
  switchToMainWindow,
  updateMiniWindowData,
  isMiniMode: () => isMiniMode
}
