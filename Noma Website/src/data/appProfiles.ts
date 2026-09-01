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

// Shared control-set definitions, reused across the Problem, How-Noma-Works,
// and Interactive Demo sections so the product story stays consistent.
// The Problem section's orbit deliberately spans as many different domains
// (code, video, CAD, browsing, design, photo, 3D, chat, music) as colors —
// the point is that these have nothing in common except that they all live
// on the same four physical keys.
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
  figma: {
    id: 'figma',
    name: 'Figma',
    shortName: 'Figma',
    controls: ['Frame', 'Component', 'Zoom', 'Comment'],
    color: '#ff7262',
  },
  photoshop: {
    id: 'photoshop',
    name: 'Photoshop',
    shortName: 'Photoshop',
    controls: ['Brush', 'Layer', 'Crop', 'Export'],
    color: '#31a8ff',
  },
  blender: {
    id: 'blender',
    name: 'Blender',
    shortName: 'Blender',
    controls: ['Extrude', 'Rotate', 'Render', 'Save'],
    color: '#e87d0d',
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    shortName: 'Discord',
    controls: ['Mute', 'Deafen', 'Push to Talk', 'Screen Share'],
    color: '#5865f2',
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    shortName: 'Spotify',
    controls: ['Play', 'Skip', 'Volume', 'Like'],
    color: '#1db954',
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

// The deterministic "Flow moment": the personalized control set Flow
// proposes for VS Code after noticing a repeated pattern. Reused by the
// interactive demo.
export const vscodeLearnedControls = ['Command Palette', 'Git Commit', 'Terminal', 'Run']
