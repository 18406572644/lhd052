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

module.exports = {
  initDatabase,
  insertUsageLog,
  getTodayAppUsage,
  getTodayTotalTime,
  getHourlyHeatmap,
  getFocusRules,
  saveFocusRule,
  deleteFocusRule,
  getDb
}
