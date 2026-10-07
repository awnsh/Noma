import type { PatternKind } from '../types'

/** The four physical control slots on a Noma device. */
export const CONTROL_SLOTS = [1, 2, 3, 4] as const
export type ControlSlot = (typeof CONTROL_SLOTS)[number]

/**
 * Every build people download is a beta until this flips. It drives the
 * "Beta" badge in the sidebar and on the welcome screen, the window title,
 * and the tray, so people are reminded the final version isn't out yet.
 * Set to false for the first production release.
 */
export const IS_BETA = true
/** "Noma Beta" while IS_BETA, plain "Noma" after. */
export const APP_DISPLAY_NAME = IS_BETA ? 'Noma Beta' : 'Noma'

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
  GET_CLICK_CAPTURE_ENABLED: 'flow:get-click-capture-enabled',
  SET_CLICK_CAPTURE_ENABLED: 'flow:set-click-capture-enabled',
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
  CLEAR_CONTROL: 'flow:clear-control',
  TEST_CONTROL_ACTION: 'flow:test-control-action',
  GET_MACROS: 'flow:get-macros',
  GET_ALL_APPLICATIONS: 'flow:get-all-applications',
  GET_APPLICATION_ICON: 'flow:get-application-icon',
  CREATE_MACRO: 'flow:create-macro',
  UPDATE_MACRO: 'flow:update-macro',
  DELETE_MACRO: 'flow:delete-macro',
  DUPLICATE_MACRO: 'flow:duplicate-macro',
  GET_CONTROLS_REFERENCING_MACRO: 'flow:get-controls-referencing-macro',
  TEST_MACRO_STEPS: 'flow:test-macro-steps',
  GET_ALL_SUGGESTIONS: 'flow:get-all-suggestions',
  GET_LEARNING_STATS: 'flow:get-learning-stats',
  GET_SHORTCUT_USAGE_STATS: 'flow:get-shortcut-usage-stats',
  GET_CONTROL_USAGE_STATS: 'flow:get-control-usage-stats',
  GET_DAILY_ACTIVITY_COUNTS: 'flow:get-daily-activity-counts',
  LIST_APPLICATION_PROFILE_SUMMARIES: 'flow:list-application-profile-summaries',
  CREATE_PROFILE_FOR_APPLICATION: 'flow:create-profile-for-application',
  RENAME_APPLICATION_PROFILE: 'flow:rename-application-profile',
  DELETE_APPLICATION_PROFILE: 'flow:delete-application-profile',
  WORKFLOW_COMBO_CAPTURED: 'flow:workflow-combo-captured',
  DEMO_SET_APPLICATION: 'flow:demo-set-application',
  DEMO_SIMULATE_WORKFLOW: 'flow:demo-simulate-workflow',
  DEMO_SIMULATE_MULTI_STEP_WORKFLOW: 'flow:demo-simulate-multi-step-workflow',
  DEMO_RESET: 'flow:demo-reset',
  CLEAR_LEARNING_DATA: 'flow:clear-learning-data',
  DELETE_ALL_DATA: 'flow:delete-all-data',
  CONFIGURE_MODULE: 'flow:configure-module',
  PING_HARDWARE: 'flow:ping-hardware',
  RESET_HARDWARE: 'flow:reset-hardware',
  SIMULATE_ENCODER_ROTATION: 'flow:simulate-encoder-rotation',
  CLEAR_DEVICE_LOG: 'flow:clear-device-log',
  GET_ONBOARDING_STATE: 'flow:get-onboarding-state',
  SAVE_ONBOARDING_STATE: 'flow:save-onboarding-state',
  HOLO_OPEN_RECORDINGS: 'flow:holo-open-recordings',
  HOLO_TOUCH_CHECK_START: 'flow:holo-touch-check-start',
  HOLO_TOUCH_CHECK_STOP: 'flow:holo-touch-check-stop',
  HOLO_TOUCH_CHECK_LAST: 'flow:holo-touch-check-last',
  GLIDE_GET_STATE: 'flow:glide-get-state',
  GLIDE_SET_ENABLED: 'flow:glide-set-enabled',
  GLIDE_SET_ZONE_COUNT: 'flow:glide-set-zone-count',
  MAC_EDGE_SWIPE_GET: 'flow:mac-edge-swipe-get',
  MAC_EDGE_SWIPE_SET: 'flow:mac-edge-swipe-set',
  GLIDE_STATE_CHANGED: 'flow:glide-state-changed',
  GLIDE_ACTIVITY: 'flow:glide-activity',
  ACTION_RUN_STATE: 'flow:action-run-state',
  GET_ACTION_RUN_STATE: 'flow:get-action-run-state',
  CANCEL_RUNNING_ACTION: 'flow:cancel-running-action',
  REMOVE_WORKFLOW: 'flow:remove-workflow',
  PREVIEW_SUGGESTION_ACTION: 'flow:preview-suggestion-action',
  GET_DIAGNOSTICS_REPORT: 'flow:get-diagnostics-report',
  OPEN_ISSUE_PAGE: 'flow:open-issue-page',
  /** Software updates (main/updater.ts): Settings' "Check for updates". */
  UPDATE_GET_STATUS: 'flow:update-get-status',
  UPDATE_CHECK: 'flow:update-check',
  UPDATE_INSTALL: 'flow:update-install',
  UPDATE_OPEN_DOWNLOAD: 'flow:update-open-download',
  UPDATE_STATUS_CHANGED: 'flow:update-status-changed',
  /** The "What's new" note shown once after an update (main/whatsNew.ts). */
  WHATS_NEW_GET: 'flow:whats-new-get',
  WHATS_NEW_DISMISS: 'flow:whats-new-dismiss',

  /**
   * Noma Notice — the small glass surface that appears bottom-centre of the
   * screen when Flow recognizes a workflow, while Noma itself is in the
   * background. Its own window (main/notifications/notificationWindow.ts)
   * loads the same renderer bundle, so these are the only channels that
   * window needs beyond the shared ones above.
   */
  WORKFLOW_NOTICE_SHOWN: 'flow:workflow-notice-shown',
  /** The notice window asking, on mount, what it should be showing —
   *  closes the race where the push arrives before React has mounted. */
  WORKFLOW_NOTICE_PENDING: 'flow:workflow-notice-pending',
  WORKFLOW_NOTICE_DISMISS: 'flow:workflow-notice-dismiss',
  WORKFLOW_NOTICE_SET_INTERACTIVE: 'flow:workflow-notice-set-interactive',
  WORKFLOW_NOTICE_REVIEW: 'flow:workflow-notice-review',
  /** main -> the *main* window: bring this suggestion into view. */
  OPEN_SUGGESTION_IN_APP: 'flow:open-suggestion-in-app',
  SIMULATE_WORKFLOW_NOTICE: 'flow:simulate-workflow-notice'
} as const

/** Version of the (future) host<->device protocol. See docs/architecture.md. */
export const PROTOCOL_VERSION = '0.1.0'

/**
 * Loopback-only port the local device transport (deviceTransportServer.ts)
 * listens on — see docs/hardware-protocol.md's "Local software transport"
 * section. The standalone `Noma Virtual Device` app hardcodes this same
 * number (there's no shared package between the two projects, same as the
 * website/app color-token sync — see the app's own docs) since it can't
 * import from here directly; keep both in sync by hand if this ever changes.
 */
export const DEVICE_TRANSPORT_PORT = 47156

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

// No paywall/tier gate on Holo: all 4 swipe-in zones are available to
// everyone, by explicit request. If a real paywall is ever wanted, enforce
// it in main (trackpadGestureService's zone count), not in the renderer's UI.

/**
 * Noma Notice's tuning, in one place because both processes need it: main
 * makes the decision, the renderer explains the decision to the user. Every
 * one of these is a judgement about how much of someone's attention Noma has
 * earned, so they belong together and in the open rather than scattered
 * through the code that happens to enforce them.
 */

/**
 * How many times a workflow must have been observed before Noma says
 * anything. Not 1: the point is that Flow noticed a *habit*, and a single
 * occurrence is an event. Detection has its own, lower bar for generating a
 * suggestion at all — this sits on top of it.
 */
export const WORKFLOW_NOTIFICATION_THRESHOLD = 3

/**
 * How long Noma stays quiet afterwards. Long on purpose: two notices half an
 * hour apart read as a tool paying attention; two a minute apart read as
 * something to switch off. Nothing is lost by waiting — the suggestions are
 * in the app either way.
 */
export const WORKFLOW_NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000

/** Below this, Flow isn't sure enough about the chain to interrupt over it. */
export const WORKFLOW_NOTIFICATION_MIN_CONFIDENCE = 0.5

/**
 * The kinds worth interrupting for: a recognized multi-step or cross-app
 * workflow. A single repeated shortcut is a perfectly good suggestion, but
 * it is also by far the most common kind — notifying on those would make
 * Notice constant, and constant is worthless.
 */
export const NOTIFIABLE_PATTERN_KINDS: PatternKind[] = ['multiStepWorkflow', 'crossAppWorkflow']


/** `Macro.trigger` of a workflow saved from a Flow suggestion. */
export const LEARNED_MACRO_TRIGGER = 'flow-control'
/** `Macro.trigger` of a workflow saved from a Demo Mode suggestion: shown as
 *  a demo, and removed by the demo reset. */
export const DEMO_MACRO_TRIGGER = 'flow-demo'

/** Which control slot each Glide zone presses. With two zones only the
 *  upper ones are used, and each covers its whole side. */
export const GLIDE_ZONE_SLOTS = {
  topLeft: 1,
  topRight: 2,
  bottomLeft: 3,
  bottomRight: 4
} as const

export type GlideZoneName = keyof typeof GLIDE_ZONE_SLOTS

/** The zones in use for a zone count, in slot order. */
export function glideZonesFor(zoneCount: 2 | 4): GlideZoneName[] {
  return zoneCount === 4 ? ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] : ['topLeft', 'topRight']
}

/** What each zone is called, by zone count. */
export const GLIDE_ZONE_LABELS: Record<2 | 4, Record<GlideZoneName, string>> = {
  2: { topLeft: 'Left', topRight: 'Right', bottomLeft: 'Left', bottomRight: 'Right' },
  4: { topLeft: 'Upper left', topRight: 'Upper right', bottomLeft: 'Lower left', bottomRight: 'Lower right' }
}

/** The Glide zone that presses `slot`, or null when that slot has no zone
 *  with this many zones (slots 3 and 4 in two-zone mode). */
export function glideZoneForSlot(slot: number, zoneCount: 2 | 4): GlideZoneName | null {
  return glideZonesFor(zoneCount).find((zone) => GLIDE_ZONE_SLOTS[zone] === slot) ?? null
}

/** Where beta testers report problems: the website's report form (the
 *  GitHub repo is going private, so its issue page won't be reachable).
 *  Opened in the browser with nothing attached: the tester writes what they
 *  choose to share. */
export const ISSUE_PAGE_URL = 'https://nomashift.com/feedback'
