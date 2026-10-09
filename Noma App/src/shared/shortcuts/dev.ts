import { cmd, type AppShortcuts } from './types'

export const DEV_TOOLS: AppShortcuts[] = [
  {
    name: 'GitHub Desktop',
    ids: ['githubdesktop'],
    shortcuts: [
      cmd('Push', 'PUSH', 'P'),
      cmd('Pull', 'PULL', 'Shift', 'P'),
      cmd('Fetch', 'FETCH', 'Shift', 'T'),
      cmd('Show changes', 'CHANGES', '1'),
      cmd('Show history', 'HISTORY', '2'),
      cmd('Branches list', 'BRANCHES', 'B'),
      cmd('New branch', 'NEW BRANCH', 'Shift', 'N'),
      cmd('Repositories list', 'REPOS', 'T'),
      cmd('Open in editor', 'EDITOR', 'Shift', 'A')
    ]
  }
]
