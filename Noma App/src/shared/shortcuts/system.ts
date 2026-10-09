import { same, type AppShortcuts } from './types'

export const SYSTEM: AppShortcuts[] = [
  {
    name: 'File Explorer',
    ids: ['explorer'],
    shortcuts: [
      same('New folder', 'NEW FOLDER', ['Control', 'Shift', 'N']),
      same('Address bar', 'ADDRESS', ['Control', 'L']),
      same('Search', 'SEARCH', ['Control', 'F']),
      same('Rename', 'RENAME', ['F2']),
      same('Properties', 'PROPERTIES', ['Alt', 'Enter']),
      same('Up one level', 'UP', ['Alt', 'ArrowUp']),
      same('Back', 'BACK', ['Alt', 'ArrowLeft']),
      same('Refresh', 'REFRESH', ['F5']),
      same('Preview pane', 'PREVIEW', ['Alt', 'P'])
    ]
  },
  {
    name: 'Finder',
    ids: ['finder'],
    shortcuts: [
      same('New folder', 'NEW FOLDER', ['Meta', 'Shift', 'N']),
      same('Go to folder', 'GO TO', ['Meta', 'Shift', 'G']),
      same('Get info', 'GET INFO', ['Meta', 'I']),
      same('Duplicate', 'DUPLICATE', ['Meta', 'D']),
      same('Show hidden files', 'HIDDEN', ['Meta', 'Shift', 'Period']),
      same('Quick Look', 'QUICK LOOK', ['Space']),
      same('Back', 'BACK', ['Meta', 'BracketLeft']),
      same('Enclosing folder', 'UP', ['Meta', 'ArrowUp'])
    ]
  },
  {
    name: 'Terminal',
    ids: ['terminal'],
    shortcuts: [
      same('New tab', 'NEW TAB', ['Meta', 'T']),
      same('New window', 'NEW WINDOW', ['Meta', 'N']),
      same('Clear screen', 'CLEAR', ['Meta', 'K']),
      same('Close tab', 'CLOSE TAB', ['Meta', 'W']),
      same('Find', 'FIND', ['Meta', 'F'])
    ]
  },
  {
    name: 'iTerm2',
    ids: ['iterm2'],
    shortcuts: [
      same('Split vertically', 'SPLIT RIGHT', ['Meta', 'D']),
      same('Split horizontally', 'SPLIT DOWN', ['Meta', 'Shift', 'D']),
      same('New tab', 'NEW TAB', ['Meta', 'T']),
      same('Clear screen', 'CLEAR', ['Meta', 'K']),
      same('Next pane', 'NEXT PANE', ['Meta', 'BracketRight']),
      same('Full screen', 'FULL SCREEN', ['Meta', 'Enter']),
      same('Find', 'FIND', ['Meta', 'F'])
    ]
  }
]
