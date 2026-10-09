import { cmd, same, type AppShortcuts } from './types'

export const EDITORS: AppShortcuts[] = [
  {
    name: 'Visual Studio Code',
    ids: ['code', 'code - insiders'],
    shortcuts: [
      cmd('Command palette', 'PALETTE', 'Shift', 'P'),
      cmd('Quick open file', 'QUICK OPEN', 'P'),
      cmd('Search in files', 'SEARCH', 'Shift', 'F'),
      cmd('Find in file', 'FIND', 'F'),
      cmd('Replace in file', 'REPLACE', 'H'),
      same('Toggle terminal', 'TERMINAL', ['Control', 'Backquote']),
      same('New terminal', 'NEW TERMINAL', ['Control', 'Shift', 'Backquote']),
      same('Run without debugging', 'RUN', ['Control', 'F5']),
      same('Start debugging', 'DEBUG', ['F5']),
      cmd('Toggle sidebar', 'SIDEBAR', 'B'),
      cmd('Toggle bottom panel', 'PANEL', 'J'),
      cmd('Explorer', 'EXPLORER', 'Shift', 'E'),
      same('Source control', 'GIT', ['Control', 'Shift', 'G']),
      cmd('Toggle line comment', 'COMMENT', 'Slash'),
      same('Go to definition', 'DEFINITION', ['F12']),
      same('Rename symbol', 'RENAME', ['F2']),
      same('Format document', 'FORMAT', ['Shift', 'Alt', 'F']),
      cmd('Split editor', 'SPLIT', 'Backslash'),
      cmd('Close editor', 'CLOSE', 'W'),
      cmd('Settings', 'SETTINGS', 'Comma')
    ]
  }
]
