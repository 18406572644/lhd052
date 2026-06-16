const Database = require('better-sqlite3')
const { app } = require('electron')
const path = require('path')
const fs = require('fs')

let db = null

function initDatabase() {
  const userDataPath = app.getPath('userData')
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }
  const dbPath = path.join(userDataPath, 'screen-time.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  createTables()
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      process_name TEXT NOT NULL,
      window_title TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      date TEXT NOT NULL,
      hour INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON usage_logs(date);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_process ON usage_logs(process_name);
    
    CREATE TABLE IF NOT EXISTS focus_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      process_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS afk_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER,
      date TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_afk_sessions_date ON afk_sessions(date);

    CREATE TABLE IF NOT EXISTS body_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      vision_fatigue INTEGER DEFAULT 0,
      cervical_comfort INTEGER DEFAULT 0,
      sleep_quality INTEGER DEFAULT 0,
      overall_feeling INTEGER DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_body_metrics_date ON body_metrics(date);

    CREATE TABLE IF NOT EXISTS rest_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger_time INTEGER NOT NULL,
      dismissed_time INTEGER,
      rest_type TEXT DEFAULT 'normal',
      was_accepted INTEGER DEFAULT 0,
      date TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rest_reminders_date ON rest_reminders(date);
  `)
}

function insertUsageLog(log) {
  if (!db) return null
  const stmt = db.prepare(`
    INSERT INTO usage_logs (process_name, window_title, start_time, end_time, duration, date, hour)
    VALUES (@process_name, @window_title, @start_time, @end_time, @duration, @date, @hour)
  `)
  const result = stmt.run(log)
  return result.lastInsertRowid
}

function getTodayAppUsage() {
  if (!db) return []
  const today = new Date().toISOString().split('T')[0]
  const stmt = db.prepare(`
    SELECT process_name, SUM(duration) as total_duration
    FROM usage_logs
    WHERE date = ?
    GROUP BY process_name
    ORDER BY total_duration DESC
    LIMIT 10
  `)
  return stmt.all(today)
}

function getTodayTotalTime() {
  if (!db) return 0
  const today = new Date().toISOString().split('T')[0]
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(duration), 0) as total
    FROM usage_logs
    WHERE date = ?
  `)
  const result = stmt.get(today)
  return result.total
}

function getHourlyHeatmap() {
  if (!db) return []
  const today = new Date().toISOString().split('T')[0]
  const stmt = db.prepare(`
    SELECT hour, COALESCE(SUM(duration), 0) as total_duration
    FROM usage_logs
    WHERE date = ?
    GROUP BY hour
    ORDER BY hour
  `)
  const results = stmt.all(today)
  const heatmap = new Array(24).fill(0)
  results.forEach(row => {
    heatmap[row.hour] = row.total_duration
  })
  return heatmap
}

function getFocusRules() {
  if (!db) return []
  const stmt = db.prepare(`
    SELECT id, process_name, start_time, end_time, enabled
    FROM focus_rules
    ORDER BY created_at DESC
  `)
  return stmt.all().map(row => ({
    ...row,
    enabled: row.enabled === 1
  }))
}

function saveFocusRule(rule) {
  if (!db) return null
  if (rule.id) {
    const stmt = db.prepare(`
      UPDATE focus_rules
      SET process_name = @process_name,
          start_time = @start_time,
          end_time = @end_time,
          enabled = @enabled
      WHERE id = @id
    `)
    stmt.run({
      ...rule,
      enabled: rule.enabled ? 1 : 0
    })
    return rule.id
  } else {
    const stmt = db.prepare(`
      INSERT INTO focus_rules (process_name, start_time, end_time, enabled, created_at)
      VALUES (@process_name, @start_time, @end_time, @enabled, @created_at)
    `)
    const result = stmt.run({
      ...rule,
      enabled: rule.enabled ? 1 : 0,
      created_at: Date.now()
    })
    return result.lastInsertRowid
  }
}

function deleteFocusRule(id) {
  if (!db) return
  const stmt = db.prepare('DELETE FROM focus_rules WHERE id = ?')
  stmt.run(id)
}

function getDb() {
  return db
}

const SOCIAL_PATTERNS = [
  '微信', 'wechat', 'qq', 'tim', 'dingtalk', '钉钉', 'slack', 'discord',
  'telegram', 'whatsapp', 'messenger', 'teams', 'zoom', '飞书', 'lark'
]

function isSocialApp(processName) {
  const name = processName.toLowerCase()
  return SOCIAL_PATTERNS.some(pattern => name.includes(pattern.toLowerCase()))
}

function getLongestContinuousSession(dateStr) {
  if (!db) return null
  const date = dateStr || new Date().toISOString().split('T')[0]
  const stmt = db.prepare(`
    SELECT start_time, end_time, duration, process_name
    FROM usage_logs
    WHERE date = ?
    ORDER BY duration DESC
    LIMIT 1
  `)
  const result = stmt.get(date)
  if (!result) return null
  
  let totalDuration = result.duration
  let sessionStart = result.start_time
  let sessionEnd = result.end_time
  let currentEnd = result.end_time
  
  const moreStmt = db.prepare(`
    SELECT start_time, end_time, duration
    FROM usage_logs
    WHERE date = ? AND start_time >= ?
    ORDER BY start_time ASC
  `)
  const rows = moreStmt.all(date, result.start_time)
  
  for (const row of rows) {
    if (row.start_time - currentEnd <= 180000) {
      totalDuration += row.duration
      sessionEnd = row.end_time
      currentEnd = row.end_time
    } else {
      break
    }
  }
  
  return {
    startTime: sessionStart,
    endTime: sessionEnd,
    duration: totalDuration,
    processName: result.process_name
  }
}

function getSocialUsageComparison() {
  if (!db) return { today: 0, yesterday: 0, diff: 0 }
  
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  
  const todayStmt = db.prepare(`
    SELECT process_name, SUM(duration) as total_duration
    FROM usage_logs
    WHERE date = ?
    GROUP BY process_name
  `)
  const yesterdayStmt = db.prepare(`
    SELECT process_name, SUM(duration) as total_duration
    FROM usage_logs
    WHERE date = ?
    GROUP BY process_name
  `)
  
  const todayRows = todayStmt.all(today)
  const yesterdayRows = yesterdayStmt.all(yesterday)
  
  let todaySocial = 0
  let yesterdaySocial = 0
  
  todayRows.forEach(row => {
    if (isSocialApp(row.process_name)) {
      todaySocial += row.total_duration
    }
  })
  
  yesterdayRows.forEach(row => {
    if (isSocialApp(row.process_name)) {
      yesterdaySocial += row.total_duration
    }
  })
  
  return {
    today: todaySocial,
    yesterday: yesterdaySocial,
    diff: todaySocial - yesterdaySocial
  }
}

function getFocusRuleEffectiveness() {
  if (!db) return []
  
  const today = new Date().toISOString().split('T')[0]
  const rules = getFocusRules().filter(r => r.enabled)
  const results = []
  
  for (const rule of rules) {
    const [sh, sm] = rule.start_time.split(':').map(Number)
    const [eh, em] = rule.end_time.split(':').map(Number)
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em
    
    const todayStmt = db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total
      FROM usage_logs
      WHERE date = ? AND process_name = ?
    `)
    const todayResult = todayStmt.get(today, rule.process_name)
    
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const yesterdayStmt = db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total
      FROM usage_logs
      WHERE date = ? AND process_name = ?
    `)
    const yesterdayResult = yesterdayStmt.get(yesterday, rule.process_name)
    
    const savedTime = Math.max(0, yesterdayResult.total - todayResult.total)
    
    if (savedTime > 0) {
      results.push({
        processName: rule.process_name,
        savedTime: savedTime
      })
    }
  }
  
  return results.sort((a, b) => b.savedTime - a.savedTime)
}

function getProductiveHours() {
  if (!db) return { hour: 9, duration: 0 }
  
  const today = new Date().toISOString().split('T')[0]
  const stmt = db.prepare(`
    SELECT hour, COALESCE(SUM(duration), 0) as total_duration
    FROM usage_logs
    WHERE date = ?
    GROUP BY hour
    ORDER BY total_duration DESC
    LIMIT 1
  `)
  const result = stmt.get(today)
  
  if (!result) return { hour: 9, duration: 0 }
  return { hour: result.hour, duration: result.total_duration }
}

function getDailyInsights() {
  const insights = []
  
  const longestSession = getLongestContinuousSession()
  if (longestSession && longestSession.duration >= 3600000) {
    const startHours = new Date(longestSession.startTime).getHours()
    const startMinutes = new Date(longestSession.startTime).getMinutes()
    const endHours = new Date(longestSession.endTime).getHours()
    const endMinutes = new Date(longestSession.endTime).getMinutes()
    const hours = Math.floor(longestSession.duration / 3600000)
    
    insights.push({
      type: 'continuous',
      icon: '⏱️',
      title: '连续使用提醒',
      message: `你今日连续使用最长的时段：${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')} - ${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')} 连续 ${hours} 小时，建议适当休息`,
      data: longestSession
    })
  }
  
  const socialComparison = getSocialUsageComparison()
  if (socialComparison.diff > 0) {
    const diffMinutes = Math.floor(socialComparison.diff / 60000)
    insights.push({
      type: 'social',
      icon: '💬',
      title: '社交应用变化',
      message: `今日社交类应用用时较昨日增加 ${diffMinutes} 分钟`,
      data: socialComparison
    })
  } else if (socialComparison.diff < 0) {
    const diffMinutes = Math.floor(Math.abs(socialComparison.diff) / 60000)
    insights.push({
      type: 'social',
      icon: '💬',
      title: '社交应用变化',
      message: `今日社交类应用用时较昨日减少 ${diffMinutes} 分钟，继续保持！`,
      data: socialComparison
    })
  }
  
  const ruleEffects = getFocusRuleEffectiveness()
  if (ruleEffects.length > 0) {
    const topEffect = ruleEffects[0]
    const savedMinutes = Math.floor(topEffect.savedTime / 60000)
    insights.push({
      type: 'focus',
      icon: '🎯',
      title: '专注规则成效',
      message: `专注规则生效期间成功减少了 ${savedMinutes} 分钟的 ${topEffect.processName} 使用`,
      data: topEffect
    })
  }
  
  const productiveHours = getProductiveHours()
  if (productiveHours.duration > 0) {
    insights.push({
      type: 'productive',
      icon: '⚡',
      title: '高效时段',
      message: `今日高效时段：上午 ${productiveHours.hour}-${productiveHours.hour + 1} 点使用最集中，建议安排重要工作`,
      data: productiveHours
    })
  }
  
  return insights
}

function getDailyHeatmapByDate(dateStr) {
  if (!db) return []
  const stmt = db.prepare(`
    SELECT hour, COALESCE(SUM(duration), 0) as total_duration
    FROM usage_logs
    WHERE date = ?
    GROUP BY hour
    ORDER BY hour
  `)
  const results = stmt.all(dateStr)
  const heatmap = new Array(24).fill(0)
  results.forEach(row => {
    heatmap[row.hour] = row.total_duration
  })
  return heatmap
}

function getWeeklyHeatmap() {
  if (!db) return { dates: [], days: [], data: [] }
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  const placeholders = dates.map(() => '?').join(',')
  const stmt = db.prepare(`
    SELECT date, hour, COALESCE(SUM(duration), 0) as total_duration
    FROM usage_logs
    WHERE date IN (${placeholders})
    GROUP BY date, hour
    ORDER BY date, hour
  `)
  const results = stmt.all(...dates)
  const data = dates.map(() => new Array(24).fill(0))
  results.forEach(row => {
    const dayIndex = dates.indexOf(row.date)
    if (dayIndex !== -1) {
      data[dayIndex][row.hour] = row.total_duration
    }
  })
  return { dates, days: dates, data }
}

function getMonthlyHeatmap() {
  if (!db) return { weeks: [], data: [], dates: [] }
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay() || 7
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - startDayOfWeek + 1)
  const dates = []
  const current = new Date(startDate)
  while (current <= lastDay || dates.length % 7 !== 0) {
    dates.push({
      date: current.toISOString().split('T')[0],
      inMonth: current.getMonth() === month,
      day: current.getDate()
    })
    current.setDate(current.getDate() + 1)
  }
  while (dates.length % 7 !== 0) {
    dates.push({
      date: current.toISOString().split('T')[0],
      inMonth: false,
      day: current.getDate()
    })
    current.setDate(current.getDate() + 1)
  }
  const dateStrings = dates.map(d => d.date)
  const placeholders = dateStrings.map(() => '?').join(',')
  const stmt = db.prepare(`
    SELECT date, COALESCE(SUM(duration), 0) as total_duration
    FROM usage_logs
    WHERE date IN (${placeholders})
    GROUP BY date
  `)
  const results = stmt.all(...dateStrings)
  const durationMap = {}
  results.forEach(row => {
    durationMap[row.date] = row.total_duration
  })
  const data = dates.map(d => ({
    ...d,
    duration: durationMap[d.date] || 0
  }))
  const weeks = []
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7))
  }
  return { weeks, data, dates: dateStrings }
}

function getLast30DaysHeatmap() {
  if (!db) return { weeks: [], data: [], dates: [] }
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const dates = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    dates.push({
      date: d.toISOString().split('T')[0],
      inMonth: true,
      day: d.getDate()
    })
  }
  const dateStrings = dates.map(d => d.date)
  const placeholders = dateStrings.map(() => '?').join(',')
  const stmt = db.prepare(`
    SELECT date, COALESCE(SUM(duration), 0) as total_duration
    FROM usage_logs
    WHERE date IN (${placeholders})
    GROUP BY date
  `)
  const results = stmt.all(...dateStrings)
  const durationMap = {}
  results.forEach(row => {
    durationMap[row.date] = row.total_duration
  })
  const data = dates.map(d => ({
    ...d,
    duration: durationMap[d.date] || 0
  }))
  const weeks = []
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, Math.min(i + 7, data.length)))
  }
  return { weeks, data, dates: dateStrings }
}

function getHourlyAppUsage(dateStr, hour) {
  if (!db) return []
  const stmt = db.prepare(`
    SELECT process_name, COALESCE(SUM(duration), 0) as total_duration
    FROM usage_logs
    WHERE date = ? AND hour = ?
    GROUP BY process_name
    ORDER BY total_duration DESC
    LIMIT 3
  `)
  return stmt.all(dateStr, hour)
}

function getDateAppUsage(dateStr) {
  if (!db) return []
  const stmt = db.prepare(`
    SELECT process_name, SUM(duration) as total_duration
    FROM usage_logs
    WHERE date = ?
    GROUP BY process_name
    ORDER BY total_duration DESC
    LIMIT 10
  `)
  return stmt.all(dateStr)
}

function getDateRangeHeatmap(range) {
  switch (range) {
    case 'today':
      return {
        type: 'day',
        data: getHourlyHeatmap()
      }
    case 'week':
      return {
        type: 'week',
        ...getWeeklyHeatmap()
      }
    case 'month':
      return {
        type: 'month',
        ...getMonthlyHeatmap()
      }
    case 'last30':
      return {
        type: 'month',
        ...getLast30DaysHeatmap()
      }
    default:
      return {
        type: 'day',
        data: getHourlyHeatmap()
      }
  }
}

function insertAfkSession(session) {
  if (!db) return null
  const stmt = db.prepare(`
    INSERT INTO afk_sessions (start_time, end_time, duration, date)
    VALUES (@start_time, @end_time, @duration, @date)
  `)
  const result = stmt.run(session)
  return result.lastInsertRowid
}

function closeOpenAfkSession(endTime) {
  if (!db) return
  const stmt = db.prepare(`
    SELECT id, start_time FROM afk_sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1
  `)
  const row = stmt.get()
  if (row) {
    const duration = endTime - row.start_time
    const updateStmt = db.prepare(`
      UPDATE afk_sessions SET end_time = ?, duration = ? WHERE id = ?
    `)
    updateStmt.run(endTime, duration, row.id)
  }
}

function getTodayAfkSessions() {
  if (!db) return []
  const today = new Date().toISOString().split('T')[0]
  const stmt = db.prepare(`
    SELECT * FROM afk_sessions WHERE date = ? ORDER BY start_time ASC
  `)
  return stmt.all(today)
}

function getAfkSessionsByDate(dateStr) {
  if (!db) return []
  const stmt = db.prepare(`
    SELECT * FROM afk_sessions WHERE date = ? ORDER BY start_time ASC
  `)
  return stmt.all(dateStr)
}

function insertBodyMetric(metric) {
  if (!db) return null
  const today = metric.date || new Date().toISOString().split('T')[0]
  const existing = db.prepare(`
    SELECT id FROM body_metrics WHERE date = ? LIMIT 1
  `).get(today)
  if (existing) {
    const stmt = db.prepare(`
      UPDATE body_metrics SET
        vision_fatigue = @vision_fatigue,
        cervical_comfort = @cervical_comfort,
        sleep_quality = @sleep_quality,
        overall_feeling = @overall_feeling,
        notes = @notes
      WHERE id = @id
    `)
    stmt.run({
      vision_fatigue: metric.vision_fatigue || 0,
      cervical_comfort: metric.cervical_comfort || 0,
      sleep_quality: metric.sleep_quality || 0,
      overall_feeling: metric.overall_feeling || 0,
      notes: metric.notes || '',
      id: existing.id
    })
    return existing.id
  }
  const stmt = db.prepare(`
    INSERT INTO body_metrics (date, vision_fatigue, cervical_comfort, sleep_quality, overall_feeling, notes, created_at)
    VALUES (@date, @vision_fatigue, @cervical_comfort, @sleep_quality, @overall_feeling, @notes, @created_at)
  `)
  const result = stmt.run({
    date: today,
    vision_fatigue: metric.vision_fatigue || 0,
    cervical_comfort: metric.cervical_comfort || 0,
    sleep_quality: metric.sleep_quality || 0,
    overall_feeling: metric.overall_feeling || 0,
    notes: metric.notes || '',
    created_at: Date.now()
  })
  return result.lastInsertRowid
}

function getBodyMetricByDate(dateStr) {
  if (!db) return null
  const stmt = db.prepare(`SELECT * FROM body_metrics WHERE date = ?`)
  return stmt.get(dateStr)
}

function getBodyMetricsRange(days) {
  if (!db) return []
  const dates = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dates.push(d.toISOString().split('T')[0])
  }
  const placeholders = dates.map(() => '?').join(',')
  const stmt = db.prepare(`
    SELECT * FROM body_metrics WHERE date IN (${placeholders}) ORDER BY date ASC
  `)
  return stmt.all(...dates)
}

function insertRestReminder(reminder) {
  if (!db) return null
  const stmt = db.prepare(`
    INSERT INTO rest_reminders (trigger_time, dismissed_time, rest_type, was_accepted, date)
    VALUES (@trigger_time, @dismissed_time, @rest_type, @was_accepted, @date)
  `)
  const result = stmt.run(reminder)
  return result.lastInsertRowid
}

function updateRestReminder(id, updates) {
  if (!db) return
  const fields = []
  const values = { id }
  if (updates.dismissed_time !== undefined) {
    fields.push('dismissed_time = @dismissed_time')
    values.dismissed_time = updates.dismissed_time
  }
  if (updates.was_accepted !== undefined) {
    fields.push('was_accepted = @was_accepted')
    values.was_accepted = updates.was_accepted ? 1 : 0
  }
  if (fields.length === 0) return
  const stmt = db.prepare(`UPDATE rest_reminders SET ${fields.join(', ')} WHERE id = @id`)
  stmt.run(values)
}

function getTodayRestReminders() {
  if (!db) return []
  const today = new Date().toISOString().split('T')[0]
  const stmt = db.prepare(`SELECT * FROM rest_reminders WHERE date = ? ORDER BY trigger_time ASC`)
  return stmt.all(today)
}

function getRestRemindersByDate(dateStr) {
  if (!db) return []
  const stmt = db.prepare(`SELECT * FROM rest_reminders WHERE date = ? ORDER BY trigger_time ASC`)
  return stmt.all(dateStr)
}

function getHealthDashboardData() {
  const today = new Date().toISOString().split('T')[0]
  const totalDuration = getTodayTotalTime()
  const heatmap = getHourlyHeatmap()
  const afkSessions = getTodayAfkSessions()
  const restReminders = getTodayRestReminders()

  const longestContinuous = getLongestContinuousSession()

  let highIntensityDuration = 0
  for (let h = 9; h <= 18; h++) {
    highIntensityDuration += heatmap[h] || 0
  }
  const highIntensityRatio = totalDuration > 0 ? highIntensityDuration / totalDuration : 0

  const longestDuration = longestContinuous ? longestContinuous.duration : 0
  const intensityScore = Math.min(40, (totalDuration / (8 * 3600000)) * 40)
  const continuousScore = Math.min(35, (longestDuration / (3 * 3600000)) * 35)
  const highIntensityScore = Math.min(25, highIntensityRatio * 25)
  const eyeStrainScore = Math.round(Math.min(100, intensityScore + continuousScore + highIntensityScore))

  const activeBreakCount = afkSessions.filter(s => s.duration && s.duration >= 60000).length
  const avgRestDuration = activeBreakCount > 0
    ? afkSessions.filter(s => s.duration && s.duration >= 60000).reduce((sum, s) => sum + s.duration, 0) / activeBreakCount
    : 0
  const totalRestDuration = afkSessions.filter(s => s.duration && s.duration >= 60000).reduce((sum, s) => sum + s.duration, 0)
  const restRatio = (totalDuration + totalRestDuration) > 0 ? totalRestDuration / (totalDuration + totalRestDuration) : 0

  const usageLogs = db.prepare(`
    SELECT start_time, end_time, duration FROM usage_logs WHERE date = ? ORDER BY start_time ASC
  `).all(today)

  let sedentarySegments = 0
  let segmentStart = null
  let segmentDuration = 0
  for (const log of usageLogs) {
    if (!segmentStart) {
      segmentStart = log.start_time
      segmentDuration = log.duration
    } else if (log.start_time - (segmentStart + segmentDuration) < 180000) {
      segmentDuration = log.end_time - segmentStart
    } else {
      if (segmentDuration >= 45 * 60000) sedentarySegments++
      segmentStart = log.start_time
      segmentDuration = log.duration
    }
  }
  if (segmentDuration >= 45 * 60000) sedentarySegments++

  const suggestedStandUps = Math.max(0, sedentarySegments)

  const now = new Date()
  const currentHour = now.getHours()
  let blueLightWeight
  if (currentHour >= 6 && currentHour < 17) {
    blueLightWeight = 1.0
  } else if (currentHour >= 17 && currentHour < 20) {
    blueLightWeight = 1.5
  } else {
    blueLightWeight = 2.5
  }
  const screenHours = totalDuration / 3600000
  const blueLightExposure = Math.round(screenHours * blueLightWeight * 10) / 10
  const isNightHighIntensity = currentHour >= 20 && totalDuration > 2 * 3600000

  return {
    eyeStrain: {
      score: eyeStrainScore,
      totalDuration,
      longestContinuousDuration: longestDuration,
      highIntensityRatio: Math.round(highIntensityRatio * 100),
      breakdown: {
        intensityScore: Math.round(intensityScore),
        continuousScore: Math.round(continuousScore),
        highIntensityScore: Math.round(highIntensityScore)
      }
    },
    restBehavior: {
      activeBreakCount,
      avgRestDuration,
      restRatio: Math.round(restRatio * 100),
      targetRestRatio: 10,
      totalRestDuration
    },
    sedentary: {
      segments: sedentarySegments,
      suggestedStandUps,
      threshold: 45
    },
    blueLight: {
      exposure: blueLightExposure,
      weight: blueLightWeight,
      timeSlot: currentHour >= 6 && currentHour < 17 ? 'daytime' : currentHour >= 17 && currentHour < 20 ? 'evening' : 'night',
      isNightHighIntensity,
      screenHours: Math.round(screenHours * 10) / 10
    }
  }
}

function getHealthScatterData(metricType, days) {
  if (!db) return { points: [], trendLine: null }
  const dates = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dates.push(d.toISOString().split('T')[0])
  }
  const placeholders = dates.map(() => '?').join(',')
  const metrics = db.prepare(`
    SELECT * FROM body_metrics WHERE date IN (${placeholders}) ORDER BY date ASC
  `).all(...dates)

  const durations = {}
  for (const date of dates) {
    const stmt = db.prepare(`SELECT COALESCE(SUM(duration), 0) as total FROM usage_logs WHERE date = ?`)
    const result = stmt.get(date)
    durations[date] = result.total
  }

  const sedentaryMap = {}
  for (const date of dates) {
    const logs = db.prepare(`SELECT start_time, end_time, duration FROM usage_logs WHERE date = ? ORDER BY start_time ASC`).all(date)
    let segs = 0
    let segStart = null
    let segDur = 0
    for (const log of logs) {
      if (!segStart) {
        segStart = log.start_time
        segDur = log.duration
      } else if (log.start_time - (segStart + segDur) < 180000) {
        segDur = log.end_time - segStart
      } else {
        if (segDur >= 45 * 60000) segs++
        segStart = log.start_time
        segDur = log.duration
      }
    }
    if (segDur >= 45 * 60000) segs++
    sedentaryMap[date] = segs
  }

  const points = []
  for (const metric of metrics) {
    const screenHours = (durations[metric.date] || 0) / 3600000
    const sedentarySegs = sedentaryMap[metric.date] || 0
    if (metricType === 'vision') {
      points.push({ x: Math.round(screenHours * 10) / 10, y: metric.vision_fatigue, date: metric.date })
    } else if (metricType === 'cervical') {
      points.push({ x: sedentarySegs, y: metric.cervical_comfort, date: metric.date })
    }
  }

  let trendLine = null
  if (points.length >= 2) {
    const n = points.length
    const sumX = points.reduce((s, p) => s + p.x, 0)
    const sumY = points.reduce((s, p) => s + p.y, 0)
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
    const denom = n * sumX2 - sumX * sumX
    if (Math.abs(denom) > 0.001) {
      const slope = (n * sumXY - sumX * sumY) / denom
      const intercept = (sumY - slope * sumX) / n
      const xMin = Math.min(...points.map(p => p.x))
      const xMax = Math.max(...points.map(p => p.x))
      trendLine = {
        slope: Math.round(slope * 100) / 100,
        intercept: Math.round(intercept * 100) / 100,
        start: { x: xMin, y: Math.round((slope * xMin + intercept) * 10) / 10 },
        end: { x: xMax, y: Math.round((slope * xMax + intercept) * 10) / 10 }
      }
    }
  }

  return { points, trendLine }
}

function getWeeklyHealthReport() {
  if (!db) return null
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const dates = []
  for (let i = dayOfWeek - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }

  const dailyData = []
  let totalScreenTime = 0
  let totalSedentary = 0
  let totalRestRatio = 0
  let lateNightDays = 0

  for (const date of dates) {
    const heatmap = getDailyHeatmapByDate(date)
    const dayTotal = heatmap.reduce((s, v) => s + v, 0)
    totalScreenTime += dayTotal

    const nightDuration = (heatmap[22] || 0) + (heatmap[23] || 0) + (heatmap[0] || 0) + (heatmap[1] || 0)
    if (nightDuration > 30 * 60000) lateNightDays++

    const logs = db.prepare(`SELECT start_time, end_time, duration FROM usage_logs WHERE date = ? ORDER BY start_time ASC`).all(date)
    let segs = 0
    let segStart = null
    let segDur = 0
    for (const log of logs) {
      if (!segStart) {
        segStart = log.start_time
        segDur = log.duration
      } else if (log.start_time - (segStart + segDur) < 180000) {
        segDur = log.end_time - segStart
      } else {
        if (segDur >= 45 * 60000) segs++
        segStart = log.start_time
        segDur = log.duration
      }
    }
    if (segDur >= 45 * 60000) segs++
    totalSedentary += segs

    const afkSessions = getAfkSessionsByDate(date)
    const totalRest = afkSessions.filter(s => s.duration && s.duration >= 60000).reduce((sum, s) => sum + s.duration, 0)
    const restRatio = (dayTotal + totalRest) > 0 ? totalRest / (dayTotal + totalRest) : 0
    totalRestRatio += restRatio

    dailyData.push({
      date,
      screenTime: dayTotal,
      sedentarySegments: segs,
      restRatio,
      nightDuration
    })
  }

  const avgScreenTime = dates.length > 0 ? totalScreenTime / dates.length : 0
  const avgSedentary = dates.length > 0 ? totalSedentary / dates.length : 0
  const avgRestRatio = dates.length > 0 ? totalRestRatio / dates.length : 0

  const screenScore = Math.max(0, 40 - (avgScreenTime / (6 * 3600000)) * 40)
  const sedentaryScore = Math.max(0, 30 - avgSedentary * 5)
  const restScore = Math.min(20, avgRestRatio * 200)
  const nightScore = Math.max(0, 10 - lateNightDays * 3)
  const totalScore = Math.round(screenScore + sedentaryScore + restScore + nightScore)

  let grade
  if (totalScore >= 80) grade = 'A'
  else if (totalScore >= 60) grade = 'B'
  else if (totalScore >= 40) grade = 'C'
  else grade = 'D'

  const suggestions = []
  if (avgScreenTime > 8 * 3600000) {
    suggestions.push('你本周平均每日屏幕时长超过 8 小时，建议每工作 1 小时起身活动 5-10 分钟')
  }
  if (avgSedentary >= 3) {
    suggestions.push(`本周日均久坐段数 ${Math.round(avgSedentary)} 次，建议设置每 45 分钟一次的站立提醒`)
  }
  if (avgRestRatio < 0.1) {
    suggestions.push('本周休息时长占比不足 10%，目标应 ≥ 10%，请增加主动休息次数')
  }
  if (lateNightDays >= 2) {
    const nightLogs = []
    for (const date of dates) {
      const logs = db.prepare(`SELECT end_time FROM usage_logs WHERE date = ? AND hour >= 22 ORDER BY end_time DESC LIMIT 1`).all(date)
      if (logs.length > 0) {
        const t = new Date(logs[0].end_time)
        nightLogs.push(`${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`)
      }
    }
    if (nightLogs.length > 0) {
      const avgLate = nightLogs.reduce((s, t) => {
        const [h, m] = t.split(':').map(Number)
        return s + h + m / 60
      }, 0) / nightLogs.length
      const avgHour = Math.floor(avgLate)
      const avgMin = Math.round((avgLate - avgHour) * 60)
      suggestions.push(`你本周平均凌晨 ${avgHour}:${String(avgMin).padStart(2, '0')} 才关闭电脑，建议将睡前屏幕时间控制在 23:30 前，预计可改善入睡质量`)
    }
  }
  if (suggestions.length === 0) {
    suggestions.push('本周健康表现良好，继续保持规律作息和适时休息的习惯！')
  }

  return {
    grade,
    totalScore,
    scores: {
      screen: Math.round(screenScore),
      sedentary: Math.round(sedentaryScore),
      rest: Math.round(restScore),
      night: Math.round(nightScore)
    },
    avgScreenTime,
    avgSedentary: Math.round(avgSedentary * 10) / 10,
    avgRestRatio: Math.round(avgRestRatio * 100),
    lateNightDays,
    daysTracked: dates.length,
    dailyData,
    suggestions
  }
}

module.exports = {
  initDatabase,
  insertUsageLog,
  getTodayAppUsage,
  getTodayTotalTime,
  getHourlyHeatmap,
  getFocusRules,
  saveFocusRule,
  deleteFocusRule,
  getDb,
  getLongestContinuousSession,
  getSocialUsageComparison,
  getFocusRuleEffectiveness,
  getProductiveHours,
  getDailyInsights,
  getDailyHeatmapByDate,
  getWeeklyHeatmap,
  getMonthlyHeatmap,
  getLast30DaysHeatmap,
  getHourlyAppUsage,
  getDateRangeHeatmap,
  getDateAppUsage,
  insertAfkSession,
  closeOpenAfkSession,
  getTodayAfkSessions,
  getAfkSessionsByDate,
  insertBodyMetric,
  getBodyMetricByDate,
  getBodyMetricsRange,
  insertRestReminder,
  updateRestReminder,
  getTodayRestReminders,
  getRestRemindersByDate,
  getHealthDashboardData,
  getHealthScatterData,
  getWeeklyHealthReport
}
