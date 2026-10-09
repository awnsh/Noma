import { cmd, type AppShortcuts } from './types'

export const COMMUNICATION: AppShortcuts[] = [
  {
    name: 'Slack',
    ids: ['slack'],
    shortcuts: [
      cmd('Quick switcher', 'SWITCHER', 'K'),
      cmd('Search', 'SEARCH', 'G'),
      cmd('All unreads', 'UNREADS', 'Shift', 'A'),
      cmd('Threads', 'THREADS', 'Shift', 'T'),
      cmd('Direct messages', 'DMS', 'Shift', 'K'),
      cmd('Mentions and reactions', 'MENTIONS', 'Shift', 'M'),
      cmd('Channel browser', 'CHANNELS', 'Shift', 'L')
    ]
  },
  {
    name: 'Discord',
    ids: ['discord'],
    shortcuts: [
      cmd('Quick switcher', 'SWITCHER', 'K'),
      cmd('Toggle mute', 'MUTE', 'Shift', 'M'),
      cmd('Toggle deafen', 'DEAFEN', 'Shift', 'D'),
      cmd('Search', 'SEARCH', 'F'),
      cmd('Inbox', 'INBOX', 'I')
    ]
  },
  {
    name: 'Zoom',
    ids: ['zoom'],
    shortcuts: [
      { label: 'Mute or unmute audio', short: 'MUTE', windows: ['Alt', 'A'], mac: ['Meta', 'Shift', 'A'] },
      { label: 'Start or stop video', short: 'VIDEO', windows: ['Alt', 'V'], mac: ['Meta', 'Shift', 'V'] },
      { label: 'Raise or lower hand', short: 'RAISE HAND', windows: ['Alt', 'Y'], mac: ['Alt', 'Y'] },
      { label: 'Show or hide chat', short: 'CHAT', windows: ['Alt', 'H'], mac: ['Meta', 'Shift', 'H'] },
      { label: 'Leave meeting', short: 'LEAVE', windows: ['Alt', 'Q'], mac: ['Meta', 'W'] }
    ]
  },
  {
    name: 'Microsoft Teams',
    ids: ['teams', 'ms-teams'],
    shortcuts: [
      cmd('Mute or unmute', 'MUTE', 'Shift', 'M'),
      cmd('Turn video on or off', 'VIDEO', 'Shift', 'O'),
      cmd('Raise or lower hand', 'RAISE HAND', 'Shift', 'K'),
      cmd('Search', 'SEARCH', 'E')
    ]
  }
]
