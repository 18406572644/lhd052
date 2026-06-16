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
  getDateAppUsage
}
