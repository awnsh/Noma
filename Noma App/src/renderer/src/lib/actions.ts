import { FLOW_ACTION_CATALOG, SYSTEM_COMMAND_CATALOG } from '@shared/constants'
import type { ControlAction } from '@shared/types'

// 'launchApplication' has no working execution path anywhere yet
// (actionExecutor.ts refuses it with "not implemented yet"). 'focusApplication'
// and 'click' do execute, but only ever come from an accepted learned-workflow
// suggestion / captured step; there's no picker to hand-author them. So the
// action-type pickers (ControlEditorModal, ModuleConfigModal) leave all three out.
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
