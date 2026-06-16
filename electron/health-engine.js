const {
  insertAfkSession,
  closeOpenAfkSession,
  insertRestReminder,
  updateRestReminder,
  getHealthDashboardData,
  getTodayRestReminders
} = require('./database')
const { sendRestReminder } = require('./ipc')

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

function getHealthEngineStatus() {
  return {
    isRunning: healthEngineInterval !== null,
    lastActivityTime,
    lastRestReminderTime,
    isAfk,
    activityFrequency: getActivityFrequency(),
    isGoldenFocusPeriod: isInGoldenFocusPeriod(),
    nextRestInterval: calculateNextRestInterval()
  }
}

module.exports = {
  startHealthEngine,
  stopHealthEngine,
  recordActivity,
  dismissRestReminder,
  getHealthEngineStatus,
  checkRestReminder
}
