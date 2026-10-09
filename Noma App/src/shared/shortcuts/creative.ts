import { cmd, same, type AppShortcuts } from './types'

export const CREATIVE: AppShortcuts[] = [
  {
    name: 'Figma',
    ids: ['figma'],
    shortcuts: [
      cmd('Quick actions', 'ACTIONS', 'Slash'),
      cmd('Group selection', 'GROUP', 'G'),
      cmd('Ungroup', 'UNGROUP', 'Shift', 'G'),
      cmd('Duplicate', 'DUPLICATE', 'D'),
      cmd('Frame selection', 'FRAME', 'Alt', 'G'),
      same('Zoom to fit', 'ZOOM FIT', ['Shift', '1']),
      same('Zoom to selection', 'ZOOM SELECT', ['Shift', '2']),
      cmd('Show or hide the interface', 'HIDE UI', 'Backslash')
    ]
  },
  {
    name: 'Photoshop',
    ids: ['photoshop'],
    shortcuts: [
      cmd('Duplicate layer', 'DUPLICATE', 'J'),
      cmd('New layer', 'NEW LAYER', 'Shift', 'N'),
      cmd('Merge down', 'MERGE DOWN', 'E'),
      cmd('Free transform', 'TRANSFORM', 'T'),
      cmd('Deselect', 'DESELECT', 'D'),
      cmd('Invert selection', 'INVERT', 'Shift', 'I'),
      cmd('Step backward', 'STEP BACK', 'Alt', 'Z')
    ]
  },
  {
    name: 'Premiere Pro',
    ids: [],
    contains: ['premiere'],
    shortcuts: [
      cmd('Add edit', 'ADD EDIT', 'K'),
      cmd('Add edit to all tracks', 'EDIT ALL', 'Shift', 'K'),
      cmd('Import', 'IMPORT', 'I'),
      cmd('Export media', 'EXPORT', 'M'),
      same('Play or pause', 'PLAY / PAUSE', ['Space']),
      same('Ripple delete', 'RIPPLE DEL', ['Shift', 'Delete']),
      cmd('Undo', 'UNDO', 'Z'),
      cmd('Save', 'SAVE', 'S')
    ]
  },
  {
    name: 'DaVinci Resolve',
    ids: ['resolve'],
    shortcuts: [
      cmd('Blade', 'BLADE', 'B'),
      cmd('Split clip', 'SPLIT', 'Backslash'),
      same('Play or pause', 'PLAY / PAUSE', ['Space']),
      cmd('Undo', 'UNDO', 'Z'),
      cmd('Redo', 'REDO', 'Shift', 'Z'),
      cmd('Save project', 'SAVE', 'S')
    ]
  }
]
