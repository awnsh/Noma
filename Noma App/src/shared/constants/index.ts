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
  ACTION_EXECUTED: 'flow:action-executed',
  GET_DEVICE_LOG: 'flow:get-device-log',
  DEVICE_LOG_ENTRY: 'flow:device-log-entry',
  GET_EXECUTION_STATUS: 'flow:get-execution-status',
  UPDATE_CONTROL: 'flow:update-control',
  RESET_CONTROL_TO_DEFAULT: 'flow:reset-control-to-default',
  TEST_CONTROL_ACTION: 'flow:test-control-action',
  GET_MACROS: 'flow:get-macros',
  GET_ALL_APPLICATIONS: 'flow:get-all-applications',
  CREATE_MACRO: 'flow:create-macro',
  UPDATE_MACRO: 'flow:update-macro',
  DELETE_MACRO: 'flow:delete-macro',
  DUPLICATE_MACRO: 'flow:duplicate-macro',
  GET_CONTROLS_REFERENCING_MACRO: 'flow:get-controls-referencing-macro',
  TEST_MACRO_STEPS: 'flow:test-macro-steps',
  GET_ALL_SUGGESTIONS: 'flow:get-all-suggestions',
  GET_LEARNING_STATS: 'flow:get-learning-stats',
  LIST_APPLICATION_PROFILE_SUMMARIES: 'flow:list-application-profile-summaries',
  CREATE_PROFILE_FOR_APPLICATION: 'flow:create-profile-for-application',
  RENAME_APPLICATION_PROFILE: 'flow:rename-application-profile',
  DELETE_APPLICATION_PROFILE: 'flow:delete-application-profile',
  WORKFLOW_COMBO_CAPTURED: 'flow:workflow-combo-captured',
  DEMO_SET_APPLICATION: 'flow:demo-set-application',
  DEMO_SIMULATE_WORKFLOW: 'flow:demo-simulate-workflow',
  DEMO_RESET: 'flow:demo-reset',
  CLEAR_LEARNING_DATA: 'flow:clear-learning-data',
  DELETE_ALL_DATA: 'flow:delete-all-data',
  CONFIGURE_MODULE: 'flow:configure-module',
  PING_HARDWARE: 'flow:ping-hardware',
  RESET_HARDWARE: 'flow:reset-hardware',
  SIMULATE_ENCODER_ROTATION: 'flow:simulate-encoder-rotation',
  CLEAR_DEVICE_LOG: 'flow:clear-device-log'
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

/**
 * The exact allowlist `systemCommands.ts` executes against — shared so the
 * Control Mapping Editor's dropdown can't drift out of sync with what's
 * actually runnable. The main process still owns the virtual-key mapping;
 * this is only the list of valid *names*.
 */
export const SYSTEM_COMMAND_CATALOG: string[] = ['volumeMute', 'volumeUp', 'volumeDown']

/** The exact allowlist `actionExecutor.ts`'s `isKnownFlowAction` accepts. */
export const FLOW_ACTION_CATALOG: string[] = ['closeWindow']
