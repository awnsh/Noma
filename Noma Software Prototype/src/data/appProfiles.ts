export interface ControlDef {
  id: string
  /** Displayed on the keycap — always short enough to fit. */
  label: string
  /** Mono caption under the label, e.g. a plausible shortcut. Cosmetic —
   *  this prototype doesn't send real keystrokes (see PRODUCT.md brief:
   *  this is a validation build, not the real, execution-backed app). */
  shortcut: string
}

/**
 * A recognizable sub-app activity — the core selling point this prototype
 * exists to demonstrate: Noma doesn't just know "VS Code is focused," it
 * notices *what you're doing inside it* from which controls you reach for,
 * and narrates that back (see lib/detectActivity.ts). `signalControlIds`
 * are the controls whose recent use counts as evidence for this activity;
 * they're also the controls that visually light up once it's recognized.
 */
export interface Activity {
  id: string
  label: string
  contextLine: string
  signalControlIds: string[]
}

export interface AppProfile {
  id: string
  name: string
  shortName: string
  /** Used sparingly — a small identity dot next to the app's name, never a
   *  fill. Omitted for apps with no single brand hue (Chrome, Word). */
  color?: string
  detailLabel: string
  detailValue: string
  /** The default context line, shown until a more specific activity below
   *  is recognized. */
  contextLine: string
  controls: ControlDef[]
  activities: Activity[]
}

export const appOrder = ['vscode', 'premiere', 'chrome', 'spotify', 'discord', 'word'] as const
export type AppId = (typeof appOrder)[number]

export const appProfiles: Record<AppId, AppProfile> = {
  vscode: {
    id: 'vscode',
    name: 'Visual Studio Code',
    shortName: 'VS Code',
    color: '#3b8eea',
    detailLabel: 'Project',
    detailValue: 'noma-app',
    contextLine: "You're editing code",
    controls: [
      { id: 'run', label: 'Run', shortcut: 'Ctrl+F5' },
      { id: 'debug', label: 'Debug', shortcut: 'F5' },
      { id: 'terminal', label: 'Terminal', shortcut: 'Ctrl+`' },
      { id: 'search', label: 'Search', shortcut: 'Ctrl+Shift+F' },
      { id: 'git', label: 'Git', shortcut: 'Ctrl+Shift+G' },
      { id: 'format', label: 'Format', shortcut: 'Shift+Alt+F' },
      { id: 'goToDefinition', label: 'Go to Definition', shortcut: 'F12' },
    ],
    activities: [
      { id: 'debugging', label: 'Debugging', contextLine: "You're debugging", signalControlIds: ['debug', 'run', 'terminal'] },
      { id: 'reviewing', label: 'Code review', contextLine: "You're reviewing changes", signalControlIds: ['git', 'format'] },
      { id: 'navigating', label: 'Navigating', contextLine: "You're navigating the codebase", signalControlIds: ['search', 'goToDefinition'] },
    ],
  },
  premiere: {
    id: 'premiere',
    name: 'Adobe Premiere Pro',
    shortName: 'Premiere Pro',
    color: '#9999ff',
    detailLabel: 'Project',
    detailValue: 'Noma Launch Video',
    contextLine: "You're editing a timeline",
    controls: [
      { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X' },
      { id: 'split', label: 'Split', shortcut: 'Ctrl+K' },
      { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
      { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z' },
      { id: 'playPause', label: 'Play/Pause', shortcut: 'Space' },
      { id: 'zoom', label: 'Zoom', shortcut: '=' },
      { id: 'markIn', label: 'Mark In', shortcut: 'I' },
      { id: 'markOut', label: 'Mark Out', shortcut: 'O' },
    ],
    activities: [
      { id: 'trimming', label: 'Trimming footage', contextLine: "You're trimming footage", signalControlIds: ['split', 'cut', 'markIn', 'markOut'] },
      { id: 'reviewing', label: 'Reviewing playback', contextLine: "You're reviewing playback", signalControlIds: ['playPause', 'zoom'] },
      { id: 'finetuning', label: 'Fine-tuning', contextLine: "You're fine-tuning edits", signalControlIds: ['undo', 'redo'] },
    ],
  },
  chrome: {
    id: 'chrome',
    name: 'Chrome',
    shortName: 'Chrome',
    detailLabel: 'Active Tab',
    detailValue: 'docs.noma.build',
    contextLine: "You're browsing",
    controls: [
      { id: 'back', label: 'Back', shortcut: 'Alt+←' },
      { id: 'forward', label: 'Forward', shortcut: 'Alt+→' },
      { id: 'newTab', label: 'New Tab', shortcut: 'Ctrl+T' },
      { id: 'closeTab', label: 'Close Tab', shortcut: 'Ctrl+W' },
      { id: 'reopenTab', label: 'Reopen Tab', shortcut: 'Ctrl+Shift+T' },
      { id: 'search', label: 'Search', shortcut: 'Ctrl+L' },
      { id: 'bookmark', label: 'Bookmark', shortcut: 'Ctrl+D' },
    ],
    activities: [
      { id: 'researching', label: 'Researching', contextLine: "You're researching", signalControlIds: ['newTab', 'search', 'bookmark'] },
      { id: 'cleaning', label: 'Tab cleanup', contextLine: "You're cleaning up tabs", signalControlIds: ['closeTab', 'reopenTab'] },
    ],
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    shortName: 'Spotify',
    color: '#1db954',
    detailLabel: 'Now Playing',
    detailValue: 'Weightless — Marconi Union',
    contextLine: "You're listening to music",
    controls: [
      { id: 'previous', label: 'Previous', shortcut: 'Ctrl+←' },
      { id: 'playPause', label: 'Play/Pause', shortcut: 'Space' },
      { id: 'next', label: 'Next', shortcut: 'Ctrl+→' },
      { id: 'volume', label: 'Volume', shortcut: 'Ctrl+↑' },
      { id: 'mute', label: 'Mute', shortcut: 'Ctrl+Shift+M' },
      { id: 'like', label: 'Like', shortcut: 'Ctrl+Shift+B' },
    ],
    activities: [
      { id: 'curating', label: 'Curating', contextLine: "You're curating a playlist", signalControlIds: ['like', 'previous', 'next'] },
    ],
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    shortName: 'Discord',
    color: '#5865f2',
    detailLabel: 'Voice Channel',
    detailValue: 'General',
    contextLine: "You're in a voice call",
    controls: [
      { id: 'mute', label: 'Mute', shortcut: 'Ctrl+Shift+M' },
      { id: 'deafen', label: 'Deafen', shortcut: 'Ctrl+Shift+D' },
      { id: 'pushToTalk', label: 'Push to Talk', shortcut: 'Hold' },
      { id: 'nextChannel', label: 'Next Channel', shortcut: 'Alt+↓' },
      { id: 'previousChannel', label: 'Previous Channel', shortcut: 'Alt+↑' },
      { id: 'search', label: 'Search', shortcut: 'Ctrl+F' },
    ],
    activities: [
      { id: 'focus', label: 'Heads-down', contextLine: "You've gone heads-down, muted", signalControlIds: ['mute', 'deafen'] },
      { id: 'hopping', label: 'Channel hopping', contextLine: "You're moving between channels", signalControlIds: ['nextChannel', 'previousChannel', 'search'] },
    ],
  },
  word: {
    id: 'word',
    name: 'Microsoft Word',
    shortName: 'Word',
    color: '#2b579a',
    detailLabel: 'Document',
    detailValue: 'Noma Product Brief',
    contextLine: "You're writing",
    controls: [
      { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
      { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y' },
      { id: 'bold', label: 'Bold', shortcut: 'Ctrl+B' },
      { id: 'italic', label: 'Italic', shortcut: 'Ctrl+I' },
      { id: 'underline', label: 'Underline', shortcut: 'Ctrl+U' },
      { id: 'heading', label: 'Heading', shortcut: 'Ctrl+Alt+1' },
      { id: 'aiAssist', label: 'AI Assist', shortcut: 'Alt+I' },
    ],
    activities: [
      { id: 'formatting', label: 'Formatting', contextLine: "You're formatting the document", signalControlIds: ['bold', 'italic', 'underline', 'heading'] },
      { id: 'revising', label: 'Revising', contextLine: "You're revising heavily", signalControlIds: ['undo', 'redo'] },
    ],
  },
}
