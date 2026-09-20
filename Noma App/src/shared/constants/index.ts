import type { HoloZone } from '../types'

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
  RESET_CONTROL_TO_DEFAULT: 'flow:reset-control-to-default',
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
  GET_INPUT_SOURCE: 'flow:get-input-source',
  SET_INPUT_SOURCE: 'flow:set-input-source',
  GET_HOLO_CALIBRATION: 'flow:get-holo-calibration',
  SAVE_HOLO_CALIBRATION: 'flow:save-holo-calibration',
  CLEAR_HOLO_CALIBRATION: 'flow:clear-holo-calibration',
  GET_LAPTOP_INFO: 'flow:get-laptop-info',
  HOLO_SET_INPUT_GATE: 'flow:holo-set-input-gate',
  HOLO_INPUT_ACTIVITY: 'flow:holo-input-activity'
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

/**
 * Holo (the free, no-hardware input option — see the `HoloZone` doc
 * comment in shared/types). Canonical order, shared by the calibration
 * wizard, the zone grid, and pattern-detection-style classification code:
 * index N maps 1:1 to control slot N+1 (frontLeft -> slot 1, frontRight ->
 * slot 2, rearLeft -> slot 3, rearRight -> slot 4) — one source of truth so
 * "which slot does this zone control" can never drift between files.
 */
export const HOLO_ZONE_ORDER: HoloZone[] = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight']

/** Zone counts Holo supports. Fewer zones on hardware that can't tell more apart. */
export type HoloZoneCount = 2 | 4

/** Which side of the laptop the (single) microphone is on. */
export type HoloMicSide = 'left' | 'right'

/**
 * The zones used at a given count. With 4 it's all of them. With 2 (a
 * one-mic laptop) both zones sit on the *microphone's* side — the one
 * place taps are heard clearly — split front/back: mic on the left gives
 * bottom-left + top-left. The list order is slot order (index 0 = slot 1).
 */
export function getHoloZones(count: HoloZoneCount, micSide: HoloMicSide = 'left'): HoloZone[] {
  if (count === 4) return HOLO_ZONE_ORDER
  return micSide === 'left' ? ['frontLeft', 'rearLeft'] : ['frontRight', 'rearRight']
}

/** Tile/wizard label. In 2-zone mode both are on one side, so Top/Bottom says it plainly. */
export function getHoloZoneLabel(zone: HoloZone, count: HoloZoneCount): string {
  if (count === 4) return HOLO_ZONE_LABELS[zone]
  const side = zone === 'frontLeft' || zone === 'rearLeft' ? 'left' : 'right'
  return `${zone === 'rearLeft' || zone === 'rearRight' ? 'Top' : 'Bottom'} ${side}`
}

/**
 * Known laptops whose microphone side has been confirmed. Deliberately tiny
 * and only holds verified entries: public sources are vague or inconsistent
 * about mic placement (some list the G14's mics along the top edge of the
 * screen), so anything not here is *measured* during calibration instead
 * (tap far left / far right, see which is louder) rather than guessed.
 */
const KNOWN_MIC_SIDES: Array<{ pattern: RegExp; side: HoloMicSide }> = [
  // ASUS ROG Zephyrus G14 — confirmed by the developer's own unit.
  { pattern: /zephyrus g14|GA40[1-3]/i, side: 'left' }
]

/** Mic side from the laptop model alone; null when the model isn't known. */
export function lookupHoloMicSide(laptop: { manufacturer: string; model: string } | null): HoloMicSide | null {
  if (!laptop) return null
  const name = `${laptop.manufacturer} ${laptop.model}`
  return KNOWN_MIC_SIDES.find((entry) => entry.pattern.test(name))?.side ?? null
}

export interface HoloZoneRecommendation {
  count: HoloZoneCount
  reason: string
}

/**
 * How many zones this computer can realistically tell apart, decided from
 * the detected laptop. Zones are told apart by *where the mic is*: a
 * MacBook's multi-mic array can triangulate four; a typical Windows laptop
 * (e.g. ROG Zephyrus G14) has one mic on one side, which can only support
 * two. Holo always listens on the built-in mic only (see micKind.ts), so
 * unknown hardware gets the conservative 2 — a reliable 2 beats a flaky 4.
 */
export function recommendHoloZoneCount(
  laptop: { platform: string; manufacturer: string; model: string } | null
): HoloZoneRecommendation {
  const name = laptop ? `${laptop.manufacturer} ${laptop.model}`.trim() : ''
  if (laptop && (laptop.platform === 'darwin' || /apple|macbook/i.test(name))) {
    return { count: 4, reason: `${name || 'MacBook'} has a multi-microphone array` }
  }
  return { count: 2, reason: `${name || 'This computer'} has one built-in microphone, enough for two zones` }
}

export const HOLO_ZONE_LABELS: Record<HoloZone, string> = {
  frontLeft: 'Front Left',
  frontRight: 'Front Right',
  rearLeft: 'Rear Left',
  rearRight: 'Rear Right'
}

// No paywall/tier gate on Holo — all 4 zones are available to everyone
// today, by explicit request. A `getMaxHoloZones(tier)`-shaped function
// (free: 2, pro: 4) existed briefly and was removed; if a real paywall
// is ever wanted, that's the shape to reintroduce, hooked into
// holoRepository.saveHoloCalibration's zone list (the actual enforcement
// point, not the renderer's UI) — see docs/architecture.md's Holo section.
