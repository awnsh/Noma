export const IPC_CHANNELS = {
  GET_FLOW_STATUS: 'flow:get-flow-status',
  GET_ACTIVE_CONTEXT: 'flow:get-active-context',
  ACTIVE_CONTEXT_CHANGED: 'flow:active-context-changed',
  GET_HARDWARE_STATUS: 'flow:get-hardware-status',
  HARDWARE_STATUS_CHANGED: 'flow:hardware-status-changed',
  DEVICE_EVENT: 'flow:device-event',
  PRESS_CONTROL: 'flow:press-control',
  ADD_MODULE: 'flow:add-module',
  REMOVE_MODULE: 'flow:remove-module',
  GET_WORKFLOW_MONITORING_ENABLED: 'flow:get-workflow-monitoring-enabled',
  SET_WORKFLOW_MONITORING_ENABLED: 'flow:set-workflow-monitoring-enabled',
  GET_DETECTED_PATTERNS: 'flow:get-detected-patterns',
  GET_SUGGESTIONS: 'flow:get-suggestions',
  RESOLVE_SUGGESTION: 'flow:resolve-suggestion',
  SUGGESTIONS_CHANGED: 'flow:suggestions-changed',
  GET_PROFILE_FOR_APPLICATION: 'flow:get-profile-for-application',
  ASSIGN_SUGGESTION_TO_CONTROL: 'flow:assign-suggestion-to-control',
  ACTION_EXECUTED: 'flow:action-executed'
} as const

/** Version of the (future) host<->device protocol. See docs/architecture.md. */
export const PROTOCOL_VERSION = '0.1.0'

/**
 * The module types a user can add to the virtual keyboard (brainstorm.md
 * section 10). Shared so the renderer's "Add Module" picker and the main
 * process's module-creation logic can't drift out of sync.
 */
export interface ModuleCatalogEntry {
  type: string
  name: string
  capabilities: string[]
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  { type: 'macro', name: 'Macro Module', capabilities: ['buttons'] },
  { type: 'encoder', name: 'Rotary Encoder Module', capabilities: ['rotate', 'press'] },
  { type: 'slider', name: 'Slider Module', capabilities: ['slide'] },
  { type: 'display', name: 'Display Module', capabilities: ['display'] },
  { type: 'numpad', name: 'Numpad Module', capabilities: ['buttons'] },
  { type: 'creator', name: 'Creator Module', capabilities: ['buttons', 'display'] }
]
