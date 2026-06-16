const {
  insertAfkSession,
  closeOpenAfkSession,
  insertRestReminder,
  updateRestReminder,
  getHealthDashboardData,
  getTodayRestReminders,
  getRestReminderSettings,
  saveRestReminderSettings
} = require('./database')
const { sendRestReminder, sendRestBreakStart, sendRestBreakEnd } = require('./ipc')

const AFK_THRESHOLD = 180000
const MIN_REST_INTERVAL = 1200000
const MAX_REST_INTERVAL = 3600000
const GOLDEN_FOCUS_HOURS = [9, 10, 11, 14, 15, 16]

let lastActivityTime = Date.now()
let lastRestReminderTime = 0
let isAfk = false
let afkStartTime = null
let activityBuffer = []
let healthEngineInterval = null
let currentReminderId = null

let consecutiveStartTime = Date.now()
let isResting = false
let restEndTime = null
let restTimer = null
let isSkipped = false
let skipEndTime = null
let trackerRef = null
let reminderShown = false

function recordActivity() {
  const now = Date.now()
  lastActivityTime = now
  activityBuffer.push(now)
  if (activityBuffer.length > 30) {
    activityBuffer.shift()
  }
  if (isAfk && afkStartTime) {
    const afkDuration = now - afkStartTime
    if (afkDuration >= 60000) {
      closeOpenAfkSession(now)
      insertAfkSession({
        start_time: afkStartTime,
        end_time: now,
        duration: afkDuration,
        date: new Date(afkStartTime).toISOString().split('T')[0]
      })
    }
    isAfk = false
    afkStartTime = null
  }
}

function getActivityFrequency() {
  const now = Date.now()
  const fifteenMinAgo = now - 900000
  const recentActivities = activityBuffer.filter(t => t >= fifteenMinAgo)
  return recentActivities.length
}

function isInGoldenFocusPeriod() {
  const hour = new Date().getHours()
  if (!GOLDEN_FOCUS_HOURS.includes(hour)) return false
  const freq = getActivityFrequency()
  return freq >= 10
}

function calculateNextRestInterval() {
  const healthData = getHealthDashboardData()
  const eyeStrainScore = healthData.eyeStrain.score
  const timeSinceLastBreak = Date.now() - lastRestReminderTime
  const activityFreq = getActivityFrequency()

  let baseInterval = MAX_REST_INTERVAL
  if (eyeStrainScore > 70) {
    baseInterval = MIN_REST_INTERVAL
  } else if (eyeStrainScore > 50) {
    baseInterval = 1800000
  } else if (eyeStrainScore > 30) {
    baseInterval = 2400000
  }

  const activityFactor = Math.max(0.7, Math.min(1.3, activityFreq / 15))
  let interval = baseInterval * activityFactor

  const timeSinceFactor = Math.max(0.8, Math.min(1.2, timeSinceLastBreak / 3600000))
  interval = interval / timeSinceFactor

  if (isInGoldenFocusPeriod()) {
    interval *= 1.5
  }

  return Math.max(MIN_REST_INTERVAL, Math.min(MAX_REST_INTERVAL * 1.5, interval))
}

function checkRestReminder() {
  const now = Date.now()
  const timeSinceLastActivity = now - lastActivityTime

  if (timeSinceLastActivity > AFK_THRESHOLD) {
    if (!isAfk) {
      isAfk = true
      afkStartTime = lastActivityTime
    }
    return
  }

  const nextInterval = calculateNextRestInterval()
  if (now - lastRestReminderTime >= nextInterval) {
    triggerRestReminder()
  }
}

function triggerRestReminder() {
  const now = Date.now()
  lastRestReminderTime = now
  const today = new Date().toISOString().split('T')[0]

  const reminderId = insertRestReminder({
    trigger_time: now,
    dismissed_time: null,
    rest_type: 'normal',
    was_accepted: 0,
    date: today
  })

  currentReminderId = reminderId

  sendRestReminder({
    id: reminderId,
    type: 'rest',
    eyeStrainScore: getHealthDashboardData().eyeStrain.score,
    timestamp: now
  })
}

function dismissRestReminder(accepted) {
  if (currentReminderId) {
    updateRestReminder(currentReminderId, {
      dismissed_time: Date.now(),
      was_accepted: accepted
    })
    currentReminderId = null
  }
}

function startHealthEngine() {
  if (healthEngineInterval) return
  lastRestReminderTime = Date.now()

  healthEngineInterval = setInterval(() => {
    checkRestReminder()
  }, 30000)

  console.log('健康引擎已启动')
}

function stopHealthEngine() {
  if (healthEngineInterval) {
    clearInterval(healthEngineInterval)
    healthEngineInterval = null
  }
  if (isAfk && afkStartTime) {
    const now = Date.now()
    const afkDuration = now - afkStartTime
    if (afkDuration >= 60000) {
      insertAfkSession({
        start_time: afkStartTime,
        end_time: now,
        duration: afkDuration,
        date: new Date(afkStartTime).toISOString().split('T')[0]
      })
    }
  }
  console.log('健康引擎已停止')
}

function getConsecutiveUsageTime() {
  if (isResting) return 0
  const now = Date.now()
  return now - consecutiveStartTime
}

function checkScheduledRestReminder() {
  const settings = getRestReminderSettings()
  if (!settings.enabled) return

  if (isResting) return

  if (reminderShown) return

  if (isSkipped && skipEndTime) {
    if (Date.now() < skipEndTime) {
      return
    }
    isSkipped = false
    skipEndTime = null
    consecutiveStartTime = Date.now()
  }

  const consecutiveTime = getConsecutiveUsageTime()
  const workDurationMs = settings.workDuration * 60 * 1000

  if (consecutiveTime >= workDurationMs) {
    triggerScheduledRestReminder()
  }
}

function triggerScheduledRestReminder() {
  const settings = getRestReminderSettings()
  const now = Date.now()
  const consecutiveMinutes = Math.floor((now - consecutiveStartTime) / 60000)

  reminderShown = true

  const reminderId = insertRestReminder({
    trigger_time: now,
    dismissed_time: null,
    rest_type: 'scheduled',
    was_accepted: 0,
    date: new Date(now).toISOString().split('T')[0]
  })

  currentReminderId = reminderId

  sendRestReminder({
    id: reminderId,
    type: 'scheduled',
    consecutiveMinutes: consecutiveMinutes,
    restDuration: settings.restDuration,
    timestamp: now
  })
}

function setTracker(tracker) {
  trackerRef = tracker
}

function startRestBreak() {
  const settings = getRestReminderSettings()
  const now = Date.now()

  isResting = true
  restEndTime = now + settings.restDuration * 60 * 1000

  if (currentReminderId) {
    updateRestReminder(currentReminderId, {
      dismissed_time: now,
      was_accepted: 1
    })
  }

  if (trackerRef && typeof trackerRef.pauseTracker === 'function') {
    trackerRef.pauseTracker()
  }

  sendRestBreakStart({
    restDuration: settings.restDuration,
    endTime: restEndTime,
    startTime: now
  })

  if (restTimer) clearTimeout(restTimer)
  restTimer = setTimeout(() => {
    endRestBreak()
  }, settings.restDuration * 60 * 1000)
}

function endRestBreak() {
  isResting = false
  restEndTime = null
  reminderShown = false
  if (restTimer) {
    clearTimeout(restTimer)
    restTimer = null
  }

  if (trackerRef && typeof trackerRef.resumeTracker === 'function') {
    trackerRef.resumeTracker()
  }

  consecutiveStartTime = Date.now()

  sendRestBreakEnd({
    endTime: Date.now()
  })
}

function skipRestBreak() {
  const settings = getRestReminderSettings()
  isSkipped = true
  skipEndTime = Date.now() + settings.workDuration * 60 * 1000
  reminderShown = false

  if (currentReminderId) {
    updateRestReminder(currentReminderId, {
      dismissed_time: Date.now(),
      was_accepted: 0
    })
    currentReminderId = null
  }

  if (isResting) {
    endRestBreak()
  }
}

function getRestBreakStatus() {
  return {
    isResting,
    restEndTime,
    consecutiveUsageTime: getConsecutiveUsageTime(),
    isSkipped,
    settings: getRestReminderSettings()
  }
}

function updateSettings(newSettings) {
  saveRestReminderSettings(newSettings)
  if (!isResting && !isSkipped) {
    consecutiveStartTime = Date.now()
  }
  return getRestReminderSettings()
}

function getHealthEngineStatus() {
  return {
    isRunning: healthEngineInterval !== null,
    lastActivityTime,
    lastRestReminderTime,
    isAfk,
    activityFrequency: getActivityFrequency(),
    isGoldenFocusPeriod: isInGoldenFocusPeriod(),
    nextRestInterval: calculateNextRestInterval(),
    restBreak: getRestBreakStatus()
  }
}

function checkRestReminder() {
  const now = Date.now()
  const timeSinceLastActivity = now - lastActivityTime

  if (timeSinceLastActivity > AFK_THRESHOLD) {
    if (!isAfk) {
      isAfk = true
      afkStartTime = lastActivityTime
      consecutiveStartTime = now
    }
    return
  }

  checkScheduledRestReminder()

  const nextInterval = calculateNextRestInterval()
  if (now - lastRestReminderTime >= nextInterval) {
    triggerRestReminder()
  }
}

module.exports = {
  startHealthEngine,
  stopHealthEngine,
  recordActivity,
  dismissRestReminder,
  getHealthEngineStatus,
  checkRestReminder,
  startRestBreak,
  endRestBreak,
  skipRestBreak,
  getRestBreakStatus,
  updateSettings,
  getRestReminderSettings,
  setTracker
}
