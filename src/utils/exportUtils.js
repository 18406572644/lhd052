function formatDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(timestamp) {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

function getDateRange(rangeType, customStart, customEnd) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  let startDate, endDate
  
  switch (rangeType) {
    case 'today':
      startDate = formatDate(now)
      endDate = startDate
      break
    case 'week':
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - 6)
      startDate = formatDate(weekStart)
      endDate = formatDate(now)
      break
    case 'month':
      const monthStart = new Date(now)
      monthStart.setDate(now.getDate() - 29)
      startDate = formatDate(monthStart)
      endDate = formatDate(now)
      break
    case 'custom':
      startDate = customStart
      endDate = customEnd
      break
    default:
      startDate = formatDate(now)
      endDate = startDate
  }
  
  return { startDate, endDate }
}

function generateCSVContent(logs) {
  const header = '\uFEFF日期,进程名,窗口标题,开始时间,结束时间,时长秒数\n'
  const rows = logs.map(log => {
    const date = log.date
    const processName = `"${(log.process_name || '').replace(/"/g, '""')}"`
    const windowTitle = `"${(log.window_title || '').replace(/"/g, '""')}"`
    const startTime = formatDateTime(log.start_time)
    const endTime = formatDateTime(log.end_time)
    const durationSeconds = Math.round(log.duration / 1000)
    return `${date},${processName},${windowTitle},${startTime},${endTime},${durationSeconds}`
  })
  return header + rows.join('\n')
}

function generateJSONContent(exportData) {
  const formattedData = {
    exportDate: new Date().toISOString(),
    dateRange: {
      start: exportData.startDate,
      end: exportData.endDate
    },
    summary: {
      totalDuration: exportData.totalDuration,
      totalDurationFormatted: formatDuration(exportData.totalDuration),
      daysTracked: Object.keys(exportData.dailyData).length,
      categorySummary: exportData.categorySummary.map(cat => ({
        ...cat,
        totalDurationFormatted: formatDuration(cat.total_duration),
        apps: cat.apps.map(app => ({
          ...app,
          totalDurationFormatted: formatDuration(app.total_duration)
        }))
      }))
    },
    dailyData: Object.entries(exportData.dailyData).map(([date, data]) => ({
      date,
      totalDuration: data.totalDuration,
      totalDurationFormatted: formatDuration(data.totalDuration),
      apps: data.apps.map(app => ({
        process_name: app.process_name,
        totalDuration: app.total_duration,
        totalDurationFormatted: formatDuration(app.total_duration),
        sessions: app.sessions.map(s => ({
          window_title: s.window_title,
          start_time: formatDateTime(s.start_time),
          end_time: formatDateTime(s.end_time),
          duration: s.duration,
          durationSeconds: Math.round(s.duration / 1000)
        }))
      }))
    }))
  }
  return JSON.stringify(formattedData, null, 2)
}

function getDefaultFileName(format, startDate, endDate) {
  const today = formatDate(new Date())
  const rangeStr = startDate === endDate ? startDate : `${startDate}_${endDate}`
  const extensions = {
    csv: 'csv',
    json: 'json',
    png: 'png'
  }
  return `ScreenTime_${rangeStr}.${extensions[format]}`
}

async function exportCSV(rangeType, customStart, customEnd) {
  const { startDate, endDate } = getDateRange(rangeType, customStart, customEnd)
  const logs = await window.electronAPI.getUsageLogs(startDate, endDate)
  
  if (!logs || logs.length === 0) {
    return { success: false, error: '该日期范围内没有数据' }
  }
  
  const content = generateCSVContent(logs)
  const fileName = getDefaultFileName('csv', startDate, endDate)
  
  const result = await window.electronAPI.showSaveDialog({
    title: '导出 CSV 文件',
    defaultPath: fileName,
    filters: [
      { name: 'CSV 文件', extensions: ['csv'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  
  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true }
  }
  
  const saveResult = await window.electronAPI.saveFile(result.filePath, content, 'utf-8')
  return saveResult
}

async function exportJSON(rangeType, customStart, customEnd) {
  const { startDate, endDate } = getDateRange(rangeType, customStart, customEnd)
  const exportData = await window.electronAPI.getExportData(startDate, endDate)
  
  if (!exportData || Object.keys(exportData.dailyData).length === 0) {
    return { success: false, error: '该日期范围内没有数据' }
  }
  
  const content = generateJSONContent(exportData)
  const fileName = getDefaultFileName('json', startDate, endDate)
  
  const result = await window.electronAPI.showSaveDialog({
    title: '导出 JSON 文件',
    defaultPath: fileName,
    filters: [
      { name: 'JSON 文件', extensions: ['json'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  
  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true }
  }
  
  const saveResult = await window.electronAPI.saveFile(result.filePath, content, 'utf-8')
  return saveResult
}

export {
  formatDate,
  formatDateTime,
  formatDuration,
  getDateRange,
  generateCSVContent,
  generateJSONContent,
  getDefaultFileName,
  exportCSV,
  exportJSON
}
