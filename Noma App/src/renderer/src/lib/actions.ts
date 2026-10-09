import { FLOW_ACTION_CATALOG, SYSTEM_COMMAND_CATALOG } from '@shared/constants'
import type { ControlAction } from '@shared/types'

// 'focusApplication', 'launchApplication' and 'click' all execute, but the
// zone editors (ControlEditorModal, ModuleConfigModal) have no app picker:
// a zone gets them only through a workflow (the Macro Studio offers the two
// app steps with a picker; 'click' only comes from a captured step). So the
// action-type pickers here leave all three out.
export type SelectableActionType = Exclude<ControlAction['type'], 'launchApplication' | 'focusApplication' | 'click' | 'none'>

export function defaultActionForType(type: SelectableActionType): ControlAction {
  switch (type) {
    case 'shortcut':
      return { type: 'shortcut', keys: [] }
    case 'macro':
      return { type: 'macro', macroId: '' }
    case 'systemCommand':
      return { type: 'systemCommand', command: SYSTEM_COMMAND_CATALOG[0] }
    case 'flowAction':
      return { type: 'flowAction', action: FLOW_ACTION_CATALOG[0] }
  }
}
