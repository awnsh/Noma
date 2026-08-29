export interface AppProfile {
  id: string
  name: string
  shortName: string
  controls: string[]
  /** The app's own identifying color, shown as a small dot wherever it's named —
   *  makes "every application is different" legible at a glance instead of every
   *  environment reading as the same gray card. Omitted where an app has no single
   *  identifying hue (e.g. Chrome's mark is inherently multicolor). */
  color?: string
}

// Shared control-set definitions, reused across the Problem, Noma-intro,
// and Interactive Demo sections so the product story stays consistent.
export const appProfiles: Record<string, AppProfile> = {
  vscode: {
    id: 'vscode',
    name: 'Visual Studio Code',
    shortName: 'VS Code',
    controls: ['Run', 'Debug', 'Terminal', 'Search'],
    color: '#3b8eea',
  },
  premiere: {
    id: 'premiere',
    name: 'Adobe Premiere',
    shortName: 'Premiere',
    controls: ['Cut', 'Ripple', 'Zoom', 'Export'],
    color: '#9999ff',
  },
  solidworks: {
    id: 'solidworks',
    name: 'SolidWorks',
    shortName: 'SolidWorks',
    controls: ['Rotate', 'Measure', 'Extrude', 'Save'],
    color: '#e2231a',
  },
  chrome: {
    id: 'chrome',
    name: 'Chrome',
    shortName: 'Chrome',
    controls: ['Back', 'Forward', 'New Tab', 'Close'],
  },
}

// Short forms for the OLED strip, which only has ~60px per cell.
const oledShortLabels: Record<string, string> = {
  Terminal: 'TERM',
  Search: 'SRCH',
  'New Tab': 'TAB',
  'Command Palette': 'PALETTE',
  'Git Commit': 'COMMIT',
}

export function oledLabel(label: string): string {
  return oledShortLabels[label] ?? label.toUpperCase()
}

// The deterministic "Flow moment": VS Code's default control set, and the
// personalized set Flow proposes after noticing a repeated pattern. Reused by
// the interactive demo and the personalization illustration.
export const vscodeDefaultControls = ['Run', 'Debug', 'Terminal', 'Search']
export const vscodeLearnedControls = ['Command Palette', 'Git Commit', 'Terminal', 'Run']
