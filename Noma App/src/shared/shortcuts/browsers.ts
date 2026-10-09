import { cmd, same, type AppShortcuts, type KnownShortcut } from './types'

const back = (): KnownShortcut => ({ label: 'Back', short: 'BACK', windows: ['Alt', 'ArrowLeft'], mac: ['Meta', 'BracketLeft'] })
const forward = (): KnownShortcut => ({ label: 'Forward', short: 'FORWARD', windows: ['Alt', 'ArrowRight'], mac: ['Meta', 'BracketRight'] })
const devTools = (): KnownShortcut => ({ label: 'Developer tools', short: 'DEV TOOLS', windows: ['Control', 'Shift', 'I'], mac: ['Meta', 'Alt', 'I'] })

export const BROWSERS: AppShortcuts[] = [
  {
    name: 'Chrome, Edge and Brave',
    ids: ['chrome', 'msedge', 'brave'],
    shortcuts: [
      cmd('New tab', 'NEW TAB', 'T'),
      cmd('Close tab', 'CLOSE TAB', 'W'),
      cmd('Reopen closed tab', 'REOPEN TAB', 'Shift', 'T'),
      same('Next tab', 'NEXT TAB', ['Control', 'Tab']),
      same('Previous tab', 'PREV TAB', ['Control', 'Shift', 'Tab']),
      back(),
      forward(),
      cmd('Reload', 'RELOAD', 'R'),
      cmd('Address bar', 'ADDRESS', 'L'),
      cmd('Bookmark page', 'BOOKMARK', 'D'),
      cmd('Find on page', 'FIND', 'F'),
      devTools(),
      cmd('New window', 'NEW WINDOW', 'N'),
      cmd('New incognito window', 'INCOGNITO', 'Shift', 'N')
    ]
  },
  {
    name: 'Firefox',
    ids: ['firefox'],
    shortcuts: [
      cmd('New tab', 'NEW TAB', 'T'),
      cmd('Close tab', 'CLOSE TAB', 'W'),
      cmd('Reopen closed tab', 'REOPEN TAB', 'Shift', 'T'),
      same('Next tab', 'NEXT TAB', ['Control', 'Tab']),
      back(),
      forward(),
      cmd('Reload', 'RELOAD', 'R'),
      cmd('Address bar', 'ADDRESS', 'L'),
      cmd('Bookmark page', 'BOOKMARK', 'D'),
      cmd('Find on page', 'FIND', 'F'),
      devTools(),
      cmd('New private window', 'PRIVATE', 'Shift', 'P')
    ]
  },
  {
    name: 'Safari',
    ids: ['safari'],
    shortcuts: [
      cmd('New tab', 'NEW TAB', 'T'),
      cmd('Close tab', 'CLOSE TAB', 'W'),
      cmd('Reopen closed tab', 'REOPEN TAB', 'Shift', 'T'),
      back(),
      forward(),
      cmd('Reload', 'RELOAD', 'R'),
      cmd('Address bar', 'ADDRESS', 'L'),
      cmd('Bookmark page', 'BOOKMARK', 'D'),
      cmd('Find on page', 'FIND', 'F'),
      devTools(),
      cmd('New private window', 'PRIVATE', 'Shift', 'N')
    ]
  }
]
