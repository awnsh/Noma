import type { WorkflowStep } from '@shared/types'
import { isAmbientApp, isSystemSurface, matchRealisticWorkflow } from './appKnowledge'

/**
 * Does a repeated chain actually make sense as a workflow? Repetition alone
 * isn't enough: in real data Flow kept offering things like "Claude → Chrome
 * → msedge" (switching windows), "Alt+Tab → WINWORD → Alt+Tab", "Paste →
 * Undo → Paste as plain text", and "Copy → Paste → Copy → Paste"; all
 * repeated, none of them something a person would want as one press.
 *
 * Two jobs, both pure:
 *
 * 1. Shortcut roles: which captured shortcuts are *getting around* (Alt+Tab,
 *    Ctrl+Arrow, Ctrl+Backspace) or *taking something back* (Undo) rather
 *    than doing something. Those are removed before detection, and an Undo
 *    also removes the action it undid (see patternDetection.withoutNoise).
 * 2. chainMakesSense: structural rules a chain has to pass before it can be
 *    suggested at all. These are hard rules, not learned weights: the learned
 *    model (ai/workflowQuality.ts) still decides among chains that make
 *    sense, but it can't be trained into suggesting nonsense.
 */

export type ShortcutRole =
  /** Takes the previous action back. */
  | 'undo'
  | 'redo'
  /** Moves the caret, switches windows or tabs, deletes a word: getting
   *  around, not doing something. */
  | 'navigation'
  /** Puts something on the clipboard. */
  | 'copy'
  | 'paste'
  | 'screenshot'
  | 'selectAll'
  | 'action'

const MODIFIERS = new Set(['Control', 'Alt', 'Meta', 'Shift'])
const NAVIGATION_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Backquote'
])

export function shortcutRole(comboKeys: string[]): ShortcutRole {
  const modifiers = new Set(comboKeys.filter((key) => MODIFIERS.has(key)))
  const keys = comboKeys.filter((key) => !MODIFIERS.has(key))
  if (keys.length !== 1) return 'action'
  const key = keys[0]
  const command = modifiers.has('Control') || modifiers.has('Meta')
  const only = (...names: string[]): boolean =>
    modifiers.size === names.length && names.every((name) => modifiers.has(name))

  if (NAVIGATION_KEYS.has(key)) return 'navigation'
  if (only('Meta') && key === 'D') return 'navigation' // show desktop
  if (command && key === 'Z') return modifiers.has('Shift') ? 'redo' : 'undo'
  if (only('Control') && key === 'Y') return 'redo'
  if (only('Meta', 'Shift') && (key === 'S' || key === '3' || key === '4' || key === '5')) return 'screenshot'
  if (command && !modifiers.has('Alt')) {
    if ((key === 'C' || key === 'X') && !modifiers.has('Shift')) return 'copy'
    if (key === 'V') return 'paste'
    if (key === 'A' && modifiers.size === 1) return 'selectAll'
  }
  return 'action'
}

/** Shortcuts that never belong in a workflow (see the note at the top). */
export function isNoiseShortcut(comboKeys: string[]): boolean {
  const role = shortcutRole(comboKeys)
  return role === 'undo' || role === 'redo' || role === 'navigation'
}

/** Not worth a control of its own: Copy, Paste, Select all and the noise
 *  above are already one quick reflex press. A control earns its place on
 *  awkward or app-specific shortcuts (Ctrl+Shift+T, Blade in Resolve). */
export function isTrivialShortcut(comboKeys: string[]): boolean {
  const role = shortcutRole(comboKeys)
  return role !== 'action' && role !== 'screenshot'
}

/** Whether an app should be left out of workflows entirely. */
export function isIgnoredApp(applicationId: string | null): boolean {
  return isAmbientApp(applicationId) || isSystemSurface(applicationId)
}

function isZoneClick(step: WorkflowStep): boolean {
  return step.type === 'click' && step.target.startsWith('zone:')
}

function roleOf(step: WorkflowStep): ShortcutRole | null {
  return step.type === 'shortcut' ? shortcutRole(step.comboKeys) : null
}

/** Identity of an action within one chain. A click is keyed by its target
 *  alone: the same named button pressed twice is one round seen twice, even
 *  if focus was briefly reported elsewhere in between. */
function actionKey(step: WorkflowStep): string {
  return step.type === 'shortcut'
    ? `key:${step.applicationId}:${step.comboKeys.join('+')}`
    : step.type === 'click'
      ? `click:${step.target}`
      : `app:${step.applicationId}`
}

/**
 * The rules, each one a shape that showed up in real suggestions and made
 * no sense:
 *
 * - It has to *do* something. A chain that's only app switches is moving
 *   between windows, except a two-app hop people genuinely make for a reason
 *   (Explorer → Teams: attach a file), which can stand on its own.
 * - No step that's getting around (Alt+Tab, Undo, Ctrl+Arrow) and no
 *   system window or music player.
 * - Every app it visits, something is done there, or the visit itself is the
 *   point (editor → browser: check the result). "Claude → Chrome → msedge"
 *   visits Chrome and does nothing. It never *starts* in an app where nothing
 *   happens, since that's where you were.
 * - It never starts or ends on a click at an unnamed spot. "Save, then click
 *   somewhere in the editor" is clicking back into the text, not a step.
 * - Each action happens once and no hop repeats: "Copy → Paste → Copy →
 *   Paste" is one round seen twice, and A → B → A → B is two rounds.
 * - Clipboard order: Paste can't come before the Copy it would have pasted.
 *   "Paste → Chrome → Copy" is the tail of one round joined to the head of
 *   the next.
 * - Clipboard steps only count when something moves somewhere: a chain
 *   that's nothing but Copy / Paste / Select all needs a Copy (or
 *   Screenshot) and a Paste in different apps. "Chrome → Copy" has no
 *   destination, and Copy then Paste in one app has no purpose a press could
 *   serve, since what was selected and where the cursor went aren't steps.
 * - It doesn't end on Select all: selecting with nothing done to the
 *   selection is the start of the next round ("Paste → Select all").
 */
export function chainMakesSense(steps: WorkflowStep[]): boolean {
  if (steps.length < 2) return false
  if (steps.some((step) => isIgnoredApp(step.applicationId))) return false
  if (steps.some((step) => step.type === 'shortcut' && isNoiseShortcut(step.comboKeys))) return false

  const actions = steps.filter((step) => step.type !== 'appSwitch')
  if (actions.length === 0) {
    return steps.length === 2 && matchRealisticWorkflow(steps.map((step) => step.applicationId)) !== null
  }

  if (isZoneClick(steps[0]) || isZoneClick(steps[steps.length - 1])) return false

  const hops = new Set<string>()
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (step.type !== 'appSwitch') continue
    const from = i > 0 ? steps[i - 1].applicationId : null
    if (i > 0) {
      const hop = `${from}>${step.applicationId}`
      if (hops.has(hop)) return false
      hops.add(hop)
    }
    const next = steps[i + 1]
    if (next && next.type !== 'appSwitch') continue
    // Nothing done in this app before leaving it (or the chain ends here).
    if (i === 0) return false
    if (!matchRealisticWorkflow([from, step.applicationId])) return false
  }

  const actionKeys = actions.map(actionKey)
  if (new Set(actionKeys).size !== actionKeys.length) return false

  const roles = actions.map(roleOf)
  const firstSource = roles.findIndex((role) => role === 'copy' || role === 'screenshot')
  const firstPaste = roles.indexOf('paste')
  if (firstSource !== -1 && firstPaste !== -1 && firstPaste < firstSource) return false

  const onlyClipboard = roles.every(
    (role) => role === 'copy' || role === 'paste' || role === 'selectAll' || role === 'screenshot'
  )
  if (onlyClipboard) {
    if (firstSource === -1 || firstPaste === -1) return false
    if (actions[firstSource].applicationId === actions[firstPaste].applicationId) return false
  }

  if (roles[roles.length - 1] === 'selectAll') return false

  return true
}

// ---------------------------------------------------------------------------
// Re-checking suggestions already stored
// ---------------------------------------------------------------------------

/** One step back from its stepSignature (patternDetection.ts):
 *  `app:<app>`, `key:<app>:<combo>`, `click:<app>:<target>`. */
function stepFromSignature(signature: string): WorkflowStep | null {
  const app = (id: string): string | null => (id === 'unknown' ? null : id)
  if (signature.startsWith('app:')) return { type: 'appSwitch', applicationId: app(signature.slice(4)) }
  const match = /^(key|click):([^:]*):(.+)$/.exec(signature)
  if (!match) return null
  const [, type, applicationId, rest] = match
  return type === 'key'
    ? { type: 'shortcut', applicationId: app(applicationId), comboKeys: rest.split('+') }
    : { type: 'click', applicationId: app(applicationId), target: rest }
}

/**
 * Whether a stored suggestion, judged by its id alone, still passes today's
 * rules. Ids embed exactly what was detected (`suggestion:shortcut:code::
 * Control+S`, `suggestion:multistep:app:chrome->key:code:Control+V`), so
 * suggestions made before a rule existed can be re-checked without
 * re-detecting anything. Kinds it can't read are kept.
 */
export function storedSuggestionMakesSense(id: string): boolean {
  const single = /^suggestion:shortcut:([^:]*)::(.+)$/.exec(id)
  if (single) return !isTrivialShortcut(single[2].split('+')) && !isIgnoredApp(single[1])

  const sequence = /^suggestion:sequence:([^:]*)::(.+)$/.exec(id)
  if (sequence) {
    const applicationId = sequence[1] === 'unknown' ? null : sequence[1]
    const steps: WorkflowStep[] = sequence[2]
      .split('->')
      .map((combo) => ({ type: 'shortcut', applicationId, comboKeys: combo.split('+') }))
    return chainMakesSense(steps)
  }

  const chain = /^suggestion:(?:workflow|multistep):(.+)$/.exec(id)
  if (chain) {
    const steps = chain[1].split('->').map(stepFromSignature)
    if (steps.some((step) => step === null)) return true
    return chainMakesSense(steps as WorkflowStep[])
  }

  return true
}
