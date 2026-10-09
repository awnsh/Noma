import { cmd, type AppShortcuts } from './types'

export const NOTES: AppShortcuts[] = [
  {
    name: 'Notion',
    ids: ['notion'],
    shortcuts: [
      cmd('Search', 'SEARCH', 'P'),
      cmd('New page', 'NEW PAGE', 'N'),
      cmd('Toggle sidebar', 'SIDEBAR', 'Backslash'),
      cmd('Go back', 'BACK', 'BracketLeft'),
      cmd('Go forward', 'FORWARD', 'BracketRight'),
      cmd('Toggle dark mode', 'DARK MODE', 'Shift', 'L')
    ]
  },
  {
    name: 'Obsidian',
    ids: ['obsidian'],
    shortcuts: [
      cmd('Quick switcher', 'SWITCHER', 'O'),
      cmd('Command palette', 'PALETTE', 'P'),
      cmd('New note', 'NEW NOTE', 'N'),
      cmd('Search all notes', 'SEARCH', 'Shift', 'F'),
      cmd('Toggle edit and preview', 'PREVIEW', 'E'),
      cmd('Graph view', 'GRAPH', 'G')
    ]
  }
]
