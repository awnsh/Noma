import { cmd, same, type AppShortcuts } from './types'

export const MUSIC: AppShortcuts[] = [
  {
    name: 'Spotify',
    ids: ['spotify'],
    shortcuts: [
      same('Play or pause', 'PLAY / PAUSE', ['Space']),
      cmd('Next track', 'NEXT', 'ArrowRight'),
      cmd('Previous track', 'PREVIOUS', 'ArrowLeft'),
      cmd('Volume up', 'VOLUME UP', 'ArrowUp'),
      cmd('Volume down', 'VOLUME DOWN', 'ArrowDown'),
      same('Like the song', 'LIKE', ['Alt', 'Shift', 'B'])
    ]
  }
]
