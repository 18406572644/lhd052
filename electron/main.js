const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } = require('electron')
const path = require('path')
const { initDatabase } = require('./database')
const { registerIpcHandlers } = require('./ipc')
const { startTracker, stopTracker } = require('./tracker')

let mainWindow = null
let tray = null

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 300,
    height: 500,
    minWidth: 280,
    minHeight: 400,
    maxWidth: 500,
    maxHeight: 800,
    frame: false,
    transparent: true,
    resizable: true,
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

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      }
    },
    { type: 'separator' },
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

  tray.on('click', () => {
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
  })
}

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  createWindow()
  createTray()
  startTracker()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', (e) => {
  e.preventDefault()
  if (mainWindow) {
    mainWindow.hide()
  }
})

app.on('before-quit', () => {
  stopTracker()
})

module.exports = {
  getMainWindow: () => mainWindow
}
