import { MAX_CONTROL_LABEL_LENGTH } from '@shared/constants'
import type { ControlAction, Macro } from '@shared/types'
import type { KnownShortcutOption } from '@shared/shortcuts'
import { formatShortcutCaption } from './describeAction'

function fit(text: string): string {
  return text.length > MAX_CONTROL_LABEL_LENGTH ? text.slice(0, MAX_CONTROL_LABEL_LENGTH).trimEnd() : text
}

/** "volumeMute" becomes "VOLUME MUTE", matching the all-caps starter labels (RUN, DEBUG). */
function humanize(id: string): string {
  return id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toUpperCase()
}

/** A workflow named "Visual Studio Code → GitHub Desktop" is best labeled for where it ends. */
function workflowLabel(name: string): string {
  const destination = name.split(/→|->/).pop()?.trim()
  return destination || name
}

/**
 * The name a zone gets by default for an action, so changing what a zone does also
 * renames it (until the user types a name of their own). Null when the action is not
 * complete yet, such as a shortcut with no keys, so the current name is left alone.
 */
export function defaultLabelForAction(
  action: ControlAction,
  macros: Macro[],
  known: KnownShortcutOption[] = []
): string | null {
  switch (action.type) {
    case 'shortcut': {
      if (action.keys.length === 0) return null
      const hit = known.find((shortcut) => shortcut.keys.join('+') === action.keys.join('+'))
      return hit ? hit.short : fit(formatShortcutCaption(action.keys))
    }
    case 'macro': {
      const macro = macros.find((candidate) => candidate.id === action.macroId)
      return macro ? fit(workflowLabel(macro.name)) : null
    }
    case 'systemCommand':
      return fit(humanize(action.command))
    case 'flowAction':
      return fit(humanize(action.action))
    default:
      return null
  }
}
