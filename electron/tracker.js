const { insertUsageLog, getFocusRules } = require('./database')
const { sendUsageUpdate, sendFocusAlert } = require('./ipc')

let trackerInterval = null
let currentWindow = null
let currentWindowStart = null
let lastAlertProcesses = new Set()

async function getActiveWindow() {
  try {
    const activeWin = await import('active-win')
    const result = await activeWin.default({})
    if (result) {
      return {
        processName: result.owner && result.owner.name ? result.owner.name : 'Unknown',
        windowTitle: result.title || ''
      }
    }
  } catch (e) {
    console.error('获取活跃窗口失败:', e.message)
  }
  return null
}

function getTimeBucketInfo(timestamp) {
  const date = new Date(timestamp)
  return {
    date: date.toISOString().split('T')[0],
    hour: date.getHours()
  }
}

function isTimeInRange(currentTime, startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  } else {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes
  }
}

function checkFocusRules(processName) {
  const now = new Date()
  const rules = getFocusRules()
  const matchingRules = rules.filter(rule => {
    if (!rule.enabled) return false
    if (rule.process_name.toLowerCase() !== processName.toLowerCase()) return false
    return isTimeInRange(now, rule.start_time, rule.end_time)
  })

  if (matchingRules.length > 0 && !lastAlertProcesses.has(processName)) {
    lastAlertProcesses.add(processName)
    sendFocusAlert({
      processName,
      rules: matchingRules,
      timestamp: Date.now()
    })
    setTimeout(() => {
      lastAlertProcesses.delete(processName)
    }, 60000)
  }
}

async function tick() {
  const now = Date.now()
  const activeWindow = await getActiveWindow()

  if (activeWindow) {
    checkFocusRules(activeWindow.processName)

    if (currentWindow &&
        currentWindow.processName === activeWindow.processName &&
        currentWindow.windowTitle === activeWindow.windowTitle) {
      return
    }

    if (currentWindow && currentWindowStart) {
      const duration = now - currentWindowStart
      if (duration >= 1000) {
        const bucketInfo = getTimeBucketInfo(currentWindowStart)
        insertUsageLog({
          process_name: currentWindow.processName,
          window_title: currentWindow.windowTitle,
          start_time: currentWindowStart,
          end_time: now,
          duration: duration,
          date: bucketInfo.date,
          hour: bucketInfo.hour
        })
      }
    }

    currentWindow = activeWindow
    currentWindowStart = now

    sendUsageUpdate({
      currentWindow,
      timestamp: now
    })
  }
}

function flushCurrentWindow() {
  if (currentWindow && currentWindowStart) {
    const now = Date.now()
    const duration = now - currentWindowStart
    if (duration >= 1000) {
      const bucketInfo = getTimeBucketInfo(currentWindowStart)
      insertUsageLog({
        process_name: currentWindow.processName,
        window_title: currentWindow.windowTitle,
        start_time: currentWindowStart,
        end_time: now,
        duration: duration,
        date: bucketInfo.date,
        hour: bucketInfo.hour
      })
    }
    currentWindowStart = now
  }
}

function startTracker() {
  if (trackerInterval) return
  tick()
  trackerInterval = setInterval(tick, 1000)
  setInterval(flushCurrentWindow, 30000)
  console.log('屏幕使用时间追踪器已启动')
}

function stopTracker() {
  if (trackerInterval) {
    clearInterval(trackerInterval)
    trackerInterval = null
  }
  flushCurrentWindow()
  console.log('屏幕使用时间追踪器已停止')
}

function getCurrentWindowInfo() {
  if (currentWindow && currentWindowStart) {
    return {
      ...currentWindow,
      startTime: currentWindowStart
    }
  }
  return currentWindow
}

module.exports = {
  startTracker,
  stopTracker,
  getCurrentWindow: getCurrentWindowInfo
}
