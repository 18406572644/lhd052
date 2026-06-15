export function getAppIcon(processName) {
  const name = processName.toLowerCase()
  const iconMap = [
    {
      patterns: ['chrome', 'edge', 'firefox', 'safari', 'brave', 'opera', 'vivaldi', 'arc'],
      icon: '🌐',
      label: '浏览器'
    },
    {
      patterns: ['code', 'vscode', 'visual studio', 'idea', 'pycharm', 'webstorm', 'clion', 'goland', 'rider', 'sublime', 'atom', 'notepad++', 'vim', 'nvim', 'neovim', 'emacs', 'eclipse'],
      icon: '💻',
      label: '编辑器'
    },
    {
      patterns: ['cmd', 'powershell', 'terminal', 'iterm', 'konsole', 'gnome-terminal', 'alacritty', 'kitty', 'wezterm', 'windows terminal', 'wt', 'bash', 'zsh', 'fish'],
      icon: '⌨️',
      label: '终端'
    },
    {
      patterns: ['spotify', 'qqmusic', 'qq音乐', 'netease', '网易云', 'cloudmusic', 'music', 'itunes', 'apple music', 'foobar', 'aimp', 'vlc'],
      icon: '🎵',
      label: '音乐'
    },
    {
      patterns: ['微信', 'wechat', 'qq', 'tim', 'dingtalk', '钉钉', 'slack', 'discord', 'telegram', 'whatsapp', 'messenger', 'teams', 'zoom', '飞书', 'lark'],
      icon: '💬',
      label: '通讯'
    },
    {
      patterns: ['explorer', 'finder', '文件', '此电脑', '回收站', 'file manager', 'nautilus', 'dolphin'],
      icon: '📁',
      label: '文件'
    },
    {
      patterns: ['word', 'excel', 'powerpoint', 'onenote', 'outlook', 'wps', 'office', 'pages', 'numbers', 'keynote'],
      icon: '📄',
      label: '办公'
    },
    {
      patterns: ['photoshop', 'illustrator', 'figma', 'sketch', 'xd', 'blender', 'premiere', 'after effects', '剪映', 'capcut'],
      icon: '🎨',
      label: '设计'
    },
    {
      patterns: ['游戏', 'game', 'steam', 'epic', 'minecraft', 'league of legends', 'lol', 'csgo', 'valorant', '原神', 'genshin'],
      icon: '🎮',
      label: '游戏'
    },
    {
      patterns: ['mail', 'thunderbird', '邮箱', '邮件'],
      icon: '📧',
      label: '邮件'
    },
    {
      patterns: ['calendar', '日历', 'outlook'],
      icon: '📅',
      label: '日历'
    },
    {
      patterns: ['settings', '设置', 'control panel', 'system', '任务管理器', 'taskmgr'],
      icon: '⚙️',
      label: '系统'
    },
    {
      patterns: ['download', '迅雷', 'motrix', 'aria2', 'qBittorrent', 'bit', 'torrent'],
      icon: '⬇️',
      label: '下载'
    }
  ]

  for (const item of iconMap) {
    if (item.patterns.some(p => name.includes(p))) {
      return item
    }
  }

  return {
    icon: '📦',
    label: processName
  }
}

export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}时${minutes}分`
  } else if (minutes > 0) {
    return `${minutes}分${seconds}秒`
  } else {
    return `${seconds}秒`
  }
}

export function formatDurationShort(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m`
  } else {
    return '<1m'
  }
}
