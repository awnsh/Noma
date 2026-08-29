// Demo data for the Macro Studio mockup in MacroStudioDemo.tsx. Types mirror
// the real app's shared MacroStep/Macro shapes (src/shared/types) closely
// enough that swapping in the real engine later is a straight copy. Only
// 'shortcut' | 'delay' | 'systemCommand' | 'flowAction' step types are
// included — the real editor also has 'launchApplication' and 'macro'
// (reference another macro), left out here since both need a cross-app
// picker list that has no equivalent in a standalone demo.

export type MacroStep =
  | { type: 'shortcut'; keys: string[] }
  | { type: 'delay'; ms: number }
  | { type: 'systemCommand'; command: string }
  | { type: 'flowAction'; action: string }

export interface DemoMacro {
  id: string
  name: string
  enabled: boolean
  actions: MacroStep[]
}

export const STEP_TYPE_LABELS: Record<MacroStep['type'], string> = {
  shortcut: 'Keyboard shortcut',
  delay: 'Wait',
  systemCommand: 'System action',
  flowAction: 'Flow action',
}

export const NEW_STEP_LABELS: Record<MacroStep['type'], string> = {
  shortcut: '+ Shortcut',
  delay: '+ Wait',
  systemCommand: '+ System action',
  flowAction: '+ Flow action',
}

// Same tiny closed vocabularies the real app's shared/constants uses.
export const SYSTEM_COMMAND_CATALOG = ['volumeMute', 'volumeUp', 'volumeDown']
export const FLOW_ACTION_CATALOG = ['closeWindow']

export function defaultStepForType(type: MacroStep['type']): MacroStep {
  switch (type) {
    case 'shortcut':
      return { type: 'shortcut', keys: [] }
    case 'delay':
      return { type: 'delay', ms: 500 }
    case 'systemCommand':
      return { type: 'systemCommand', command: SYSTEM_COMMAND_CATALOG[0] }
    case 'flowAction':
      return { type: 'flowAction', action: FLOW_ACTION_CATALOG[0] }
  }
}

// Two seeded macros. "Quick Commit" deliberately mirrors the "Flow noticed
// Command Palette -> Git Commit" moment from the Interactive Demo section —
// this is the macro someone would actually build from that pattern.
export const initialMacros: DemoMacro[] = [
  {
    id: 'quick-commit',
    name: 'Quick Commit',
    enabled: true,
    actions: [
      { type: 'shortcut', keys: ['Control', 'Shift', 'P'] },
      { type: 'delay', ms: 300 },
      { type: 'shortcut', keys: ['Control', 'Enter'] },
    ],
  },
  {
    id: 'export-and-notify',
    name: 'Export & Notify',
    enabled: true,
    actions: [
      { type: 'shortcut', keys: ['Control', 'M'] },
      { type: 'delay', ms: 800 },
      { type: 'systemCommand', command: 'volumeUp' },
    ],
  },
]
