export interface AppProfile {
  id: string
  name: string
  shortName: string
  controls: string[]
}

// Shared control-set definitions, reused across the Problem, Noma-intro,
// and Interactive Demo sections so the product story stays consistent.
export const appProfiles: Record<string, AppProfile> = {
  vscode: {
    id: 'vscode',
    name: 'Visual Studio Code',
    shortName: 'VS Code',
    controls: ['Run', 'Debug', 'Terminal', 'Search'],
  },
  premiere: {
    id: 'premiere',
    name: 'Adobe Premiere',
    shortName: 'Premiere',
    controls: ['Cut', 'Ripple', 'Zoom', 'Export'],
  },
  solidworks: {
    id: 'solidworks',
    name: 'SolidWorks',
    shortName: 'SolidWorks',
    controls: ['Rotate', 'Measure', 'Extrude', 'Save'],
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
