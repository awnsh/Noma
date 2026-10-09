import { cmd, type AppShortcuts } from './types'

export const OFFICE: AppShortcuts[] = [
  {
    name: 'Microsoft Word',
    ids: ['winword'],
    shortcuts: [
      cmd('Bold', 'BOLD', 'B'),
      cmd('Italic', 'ITALIC', 'I'),
      cmd('Underline', 'UNDERLINE', 'U'),
      cmd('Find', 'FIND', 'F'),
      cmd('Save', 'SAVE', 'S'),
      cmd('Print', 'PRINT', 'P')
    ]
  },
  {
    name: 'Microsoft Outlook',
    ids: ['outlook'],
    shortcuts: [
      cmd('Reply', 'REPLY', 'R'),
      cmd('Reply all', 'REPLY ALL', 'Shift', 'R'),
      cmd('Forward', 'FORWARD', 'F'),
      cmd('Send', 'SEND', 'Enter')
    ]
  }
]
