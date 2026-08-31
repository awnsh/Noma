/**
 * Domain types shared between the main process and the renderer.
 *
 * Keeping these in one place — and keeping them small, flat, and plain
 * JSON-serializable — is deliberate: this is the same shape of data that
 * will eventually need to travel over the wire to the STM32 hardware
 * (see docs/architecture.md, "Hardware Embedding Considerations").
 */

export interface Application {
  id: string
  name: string
  processName: string
  icon?: string
}

export type ControlAction =
  | { type: 'shortcut'; keys: string[] }
  | { type: 'macro'; macroId: string }
  | { type: 'launchApplication'; applicationId: string }
  | { type: 'systemCommand'; command: string }
  | { type: 'flowAction'; action: string }

export interface Control {
  id: string
  /** 1-based physical slot position (maps to a control on the keyboard/module). */
  slot: number
  /** Short label — must remain renderable on a small physical display (~12 chars). */
  label: string
  action: ControlAction
}

export interface ApplicationProfile {
  id: string
  applicationId: string
  name: string
  icon?: string
  controls: Control[]
  macroIds: string[]
  moduleRecommendationIds: string[]
}

/** One row in the Profiles page's list — every application Flow knows
 *  about (seeded, or previously bootstrapped), and whether it has a
 *  profile yet. Deliberately doesn't include applications Flow has never
 *  seen and no one has bootstrapped a profile for — there's nothing to
 *  list for those until they're detected (see the Dashboard's contextual
 *  "create a profile" prompt) or created by hand from this page. */
export interface ApplicationProfileSummary {
  application: Application
  hasProfile: boolean
  profileName?: string
}

export type WorkflowEventType = 'shortcut' | 'sequence' | 'controlActivation'

export interface WorkflowEvent {
  id?: number
  applicationId: string | null
  eventType: WorkflowEventType
  /** Command-modifier key combo only — never raw typed content. See captureFilter.ts. */
  comboKeys?: string[]
  controlId?: string
  timestamp: number
}

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'dismissed'

/**
 * What accepting a suggestion actually does — assign a shortcut directly
 * to one of the (existing, user-chosen) 4 control slots, or create a
 * macro from a repeated sequence and assign *that* to a chosen slot.
 * Flow never picks the slot itself; see `docs/architecture.md`'s note on
 * why that stays a human decision.
 */
export type SuggestionAction =
  | { kind: 'assignShortcutToControl'; comboKeys: string[] }
  | { kind: 'createMacroAndAssignToControl'; sequence: string[] }

/**
 * The actual arithmetic behind one suggestion's confidence percentage —
 * persisted at generation time so "why am I seeing this?" always reflects
 * the real numbers that produced it, not a plausible-sounding guess made up
 * after the fact. Every field here is a real, deterministic quantity
 * (brainstorm.md's local rule-based engine, not an LLM) — see
 * suggestionRules.ts for how it's built and patternDetection.ts for the
 * thresholds.
 */
export interface ConfidenceBreakdown {
  /** How many times this exact pattern occurred today. */
  occurrenceCount: number
  /** The occurrence count required before a suggestion is generated at all. */
  threshold: number
  /** 0.5 plus a small nudge for every occurrence past the threshold. */
  baseConfidence: number
  /** Nudge from this pattern kind's historical accept/reject ratio across
   *  all past suggestions of this kind, bounded to +-0.15. */
  historyBias: number
  /** How many past suggestions of this kind were accepted / rejected — the
   *  raw counts behind historyBias. */
  priorAccepted: number
  priorRejected: number
}

export interface Suggestion {
  id: string
  title: string
  explanation: string
  confidence: number
  status: SuggestionStatus
  createdAt: number
  resolvedAt?: number
  /** Which application's profile this suggestion (and its slot picker) applies to. */
  applicationId?: string | null
  /** Absent for suggestions created before this field existed. */
  action?: SuggestionAction
  /** Absent for suggestions created before this field existed, or for
   *  pattern kinds that don't carry one (there are none today, but a future
   *  AIProvider isn't required to supply it). */
  confidenceBreakdown?: ConfidenceBreakdown
}

/**
 * One pattern kind's learning state — the Flow Learning Center's per-kind
 * card. `label`/`description`/`threshold` are the static "how it works"
 * half; `accepted`/`rejected`/`bias` are the live history half (same
 * numbers `getSuggestionHistoryForKind` feeds into a fresh suggestion's
 * confidenceBreakdown).
 */
export interface PatternKindStats {
  kind: PatternKind
  label: string
  description: string
  threshold: number
  accepted: number
  rejected: number
  bias: number
}

export interface LearningStats {
  kinds: PatternKindStats[]
}

/**
 * One step in a macro's sequence. Reuses `ControlAction`'s variants
 * (shortcut/macro/launchApplication/systemCommand/flowAction) so a macro
 * step and a control's action are drawn from exactly the same executable
 * vocabulary — only `delay` is macro-specific, a pause with no equivalent
 * as a standalone control action. The `macro` variant lets a macro
 * reference another macro; actionExecutor.ts guards that against cycles
 * and excessive nesting at run time.
 */
export type MacroStep = ControlAction | { type: 'delay'; ms: number }

export interface Macro {
  id: string
  name: string
  applicationId?: string
  trigger: string
  actions: MacroStep[]
  delayMs: number
  enabled: boolean
}

export interface Module {
  id: string
  name: string
  type: string
  capabilities: string[]
  controlIds: string[]
  position?: number
  configuration?: Record<string, unknown>
}

/** What a module's capability function (e.g. a Rotary Encoder's "Turn") is
 *  assigned to do — a short display name plus a real, executable action.
 *  See `FlowApi.configureModule`. */
export interface ModuleFunctionConfig {
  label: string
  action: ControlAction
}

export interface FlowStatus {
  actionsObservedToday: number
  patternsDetected: number
  suggestionsCount: number
}

/**
 * The active application plus its resolved profile (or null if none is
 * configured yet for that application) — what the dashboard needs to
 * render "Current Application" + "Current Controls" together, and what
 * gets pushed to the renderer whenever the foreground application changes
 * (brainstorm.md section 17, "Contextual UI").
 */
export interface ApplicationContext {
  application: Application | null
  profile: ApplicationProfile | null
}

export interface LEDState {
  on: boolean
  color?: string
}

/**
 * DEVICE → HOST events (brainstorm.md section 21's future protocol,
 * modeled now on the virtual device so the real STM32HardwareDevice can
 * emit the exact same shape later — parsed from serial/USB bytes instead
 * of raised by a UI click).
 */
export type DeviceEvent =
  | { type: 'buttonPress'; controlId: string; slot: number }
  | { type: 'encoderRotate'; moduleId: string; delta: number }
  | { type: 'moduleConnected'; module: Module }
  | { type: 'moduleDisconnected'; moduleId: string }

export interface DeviceStatus {
  connected: boolean
  /** 'stm32' identifies the future physical prototype specifically (not
   *  just a generic transport) — see src/main/hardware/stm32Device.ts. */
  deviceType: 'virtual' | 'usb' | 'serial' | 'stm32'
  /** Host<->device protocol version. See docs/architecture.md. */
  protocolVersion: string
  /** Present once real firmware exists. */
  firmwareVersion?: string
  controls: Control[]
  displays: Record<string, string>
  modules: Module[]
}

/**
 * A repeated-behavior pattern found by the deterministic pattern-detection
 * engine (brainstorm.md section 11) over already-captured, already-sanitized
 * WorkflowEvent metadata. Never derived from anything but comboKeys/
 * controlId/timestamp — see docs/privacy-and-legal.md.
 *
 * Discriminated on `kind` so the suggestion engine (Phase 5) can pull the
 * specific structured data (comboKeys/sequence/controlId) it needs to write
 * suggestion copy, instead of parsing the human-readable `description`.
 */
export type PatternKind = 'repeatedShortcut' | 'repeatedSequence' | 'frequentControl'

interface DetectedPatternBase {
  id: string
  applicationId: string | null
  description: string
  count: number
}

export type DetectedPattern =
  | (DetectedPatternBase & { kind: 'repeatedShortcut'; comboKeys: string[] })
  | (DetectedPatternBase & { kind: 'repeatedSequence'; sequence: string[] })
  | (DetectedPatternBase & { kind: 'frequentControl'; controlId: string })

/** Whether pressing a control actually did what it was configured to do —
 *  pushed after every press so a failure (e.g. couldn't focus the target
 *  window) is visible, not silent. See actionExecutor.ts. */
export interface ActionExecutionEvent {
  controlId: string
  ok: boolean
  reason?: string
}

/**
 * A single HOST<->DEVICE communication event, logged for Developer Mode
 * (brainstorm.md section 20) using the same message names as the future
 * STM32 wire protocol (docs/hardware-protocol.md) — SET_CONTROLS,
 * SET_DISPLAY, BUTTON_PRESS, and so on. `toDevice` entries are host
 * commands (today: calls into VirtualHardwareDevice); `fromDevice`
 * entries are the DeviceEvents the device raises. This is exactly the log
 * a real firmware bridge will need once real hardware exists.
 */
export interface DeviceLogEntry {
  direction: 'toDevice' | 'fromDevice'
  type: string
  detail?: string
  timestamp: number
}

/**
 * First-launch onboarding (docs/architecture.md's "first 60-90 seconds").
 * One small persisted record — see onboardingRepository.ts — not a
 * dedicated table; this is a single user-preference blob, not relational
 * data, so it lives in the same generic `settings` key/value table
 * workflowMonitoringEnabled already uses.
 */
export type OnboardingStepId =
  | 'welcome'
  | 'useCases'
  | 'flowPrivacy'
  | 'hardware'
  | 'demo'
  | 'completion'

export interface OnboardingState {
  completed: boolean
  /** The last screen reached — lets a relaunch mid-onboarding resume there
   *  instead of restarting from Welcome. */
  step: OnboardingStepId
  selectedUseCases: string[]
  flowEnabled: boolean
  hardwareSkipped: boolean
}

/** Whether real keystroke sending (shortcut/macro controls) is currently
 *  enabled — see the big comment at KEYSTROKE_EXECUTION_ENABLED in
 *  actionExecutor.ts. Surfaced in Developer Mode so it's never a silent
 *  surprise why a control isn't doing anything. */
export interface ExecutionStatus {
  keystrokeExecutionEnabled: boolean
}

/** The outcome of a one-off "Test" execution from the Control Mapping
 *  Editor — same shape as the real pressControl outcome, just not tied to
 *  a saved control id. */
export interface TestActionResult {
  ok: boolean
  reason?: string
}

/**
 * The contract exposed to the renderer via the preload bridge
 * (window.flow). Defined here so both main and renderer type-check
 * against the same shape without importing across process boundaries.
 */
export interface FlowApi {
  getFlowStatus(): Promise<FlowStatus>
  getActiveContext(): Promise<ApplicationContext>
  /** Subscribes to live application-context changes. Returns an unsubscribe function. */
  onActiveContextChanged(callback: (context: ApplicationContext) => void): () => void
  getHardwareStatus(): Promise<DeviceStatus>
  /** Subscribes to live hardware-status changes. Returns an unsubscribe function. */
  onHardwareStatusChanged(callback: (status: DeviceStatus) => void): () => void
  /** Subscribes to DEVICE → HOST events (button presses, module changes). Returns an unsubscribe function. */
  onDeviceEvent(callback: (event: DeviceEvent) => void): () => void
  /**
   * Presses the given control on the virtual keyboard. This actually
   * executes the control's configured action (sends the real shortcut,
   * plays the macro, or runs the system command) — see
   * docs/architecture.md's "Real execution" section. Not a simulation.
   */
  pressControl(controlId: string): Promise<void>
  /** Subscribes to the outcome of each pressControl call. Returns an unsubscribe function. */
  onActionExecuted(callback: (event: ActionExecutionEvent) => void): () => void
  addModule(moduleType: string): Promise<void>
  removeModule(moduleId: string): Promise<void>
  /** Whether Flow is currently watching for command-modifier shortcuts. Off by default. */
  getWorkflowMonitoringEnabled(): Promise<boolean>
  /** Enables/disables workflow monitoring, engaging or releasing the OS-level hook. Returns the new state. */
  setWorkflowMonitoringEnabled(enabled: boolean): Promise<boolean>
  getDetectedPatterns(): Promise<DetectedPattern[]>
  /** Pending suggestions, freshly re-derived from today's patterns. */
  getSuggestions(): Promise<Suggestion[]>
  /** Every suggestion ever generated, regardless of status — the Flow
   *  Learning Center's history list, most recent first. */
  getAllSuggestions(): Promise<Suggestion[]>
  /** Per-pattern-kind learning state (thresholds + accept/reject history +
   *  the resulting bias) — the Flow Learning Center's "how Flow decides"
   *  cards. */
  getLearningStats(): Promise<LearningStats>
  /**
   * Resolves a suggestion directly: always for reject/dismiss, and for
   * accept only as a fallback when there's no profile to assign a slot in
   * (assignSuggestionToControl is the normal accept path).
   */
  resolveSuggestion(id: string, status: 'accepted' | 'rejected' | 'dismissed'): Promise<Suggestion | null>
  /** Subscribes to live suggestion-list changes. Returns an unsubscribe function. */
  onSuggestionsChanged(callback: (suggestions: Suggestion[]) => void): () => void
  /** The profile for a specific application, regardless of which app is currently focused. */
  getProfileForApplication(applicationId: string): Promise<ApplicationProfile | null>
  /** Accepts a suggestion by assigning its action to the given control slot of its application's profile. */
  assignSuggestionToControl(
    suggestionId: string,
    slot: number
  ): Promise<{ suggestion: Suggestion; profile: ApplicationProfile } | null>
  /** The HOST<->DEVICE log, most recent last, capped in size. See DeviceLogEntry. */
  getDeviceLog(): Promise<DeviceLogEntry[]>
  /** Subscribes to live device-log entries as they happen. Returns an unsubscribe function. */
  onDeviceLogEntry(callback: (entry: DeviceLogEntry) => void): () => void
  getExecutionStatus(): Promise<ExecutionStatus>

  /**
   * Control Mapping Editor (brainstorm.md section 18). Writes directly —
   * unlike assignSuggestionToControl, there's no suggestion behind this,
   * just the user's own choice. Returns the updated profile, or null if
   * the application/slot doesn't exist.
   */
  updateControl(
    applicationId: string,
    slot: number,
    label: string,
    action: ControlAction
  ): Promise<ApplicationProfile | null>
  /** Restores a control to its original seed configuration. Returns null
   *  if this application was never seeded — there's nothing to reset to. */
  resetControlToDefault(applicationId: string, slot: number): Promise<ApplicationProfile | null>
  /** Runs a control action once, against whatever the last known real
   *  application was, without saving it to any control. Same execution
   *  path and same safety rules (closed vocabulary, blocklist, fail-closed
   *  focus) as a real press. */
  testControlAction(action: ControlAction): Promise<TestActionResult>
  /** All macros, for the editor's macro picker and the Macro Studio's list. */
  getMacros(): Promise<Macro[]>
  /** All known applications, for the Macro Studio's "assign to control" and launch-application pickers. */
  getAllApplications(): Promise<Application[]>

  /** Personalized Application Profiles (Product Development Phase 2).
   *  Every known application, and whether it has a profile yet — the
   *  Profiles page's list. */
  listApplicationProfileSummaries(): Promise<ApplicationProfileSummary[]>
  /** Bootstraps a brand-new profile (with 4 empty controls) for an
   *  application that doesn't have one yet. Returns null if it already
   *  does — use updateControl to change an existing profile instead. */
  createProfileForApplication(
    application: Application,
    profileName: string
  ): Promise<ApplicationProfile | null>
  /** Renames an existing profile. Returns null if this application has no profile. */
  renameApplicationProfile(applicationId: string, name: string): Promise<ApplicationProfile | null>
  /** Deletes a profile and every control under it. Returns whether a profile actually existed to delete. */
  deleteApplicationProfile(applicationId: string): Promise<boolean>

  /**
   * Improved Virtual Keyboard (Product Development Phase 2). Fires with
   * exactly the combo just captured by workflow monitoring — the same
   * already-sanitized Ctrl/Alt/Win-gated combo that's persisted as a
   * WorkflowEvent, never a bare keystroke (see docs/privacy-and-legal.md).
   * Only ever fires while workflow monitoring is enabled, since that's the
   * only time the underlying hook is even installed. Lets the decorative
   * keyboard layout flash the real keys of a real captured shortcut —
   * "digital twin" reacting to genuine input, not a canned animation.
   */
  onWorkflowComboCaptured(callback: (comboKeys: string[]) => void): () => void

  /** Macro Studio (Product Development Phase 2). Manual macro authoring,
   *  independent of Flow's suggestion engine. */
  createMacro(name: string, actions: MacroStep[], applicationId?: string): Promise<Macro>
  updateMacro(
    id: string,
    updates: { name?: string; actions?: MacroStep[]; enabled?: boolean }
  ): Promise<Macro | null>
  deleteMacro(id: string): Promise<boolean>
  duplicateMacro(id: string): Promise<Macro | null>
  /** Which controls (application/slot/label) currently point at this macro
   *  — shown as a warning before deleting one that's still in use. */
  getControlsReferencingMacro(macroId: string): Promise<
    Array<{ applicationId: string; applicationName: string; slot: number; label: string }>
  >
  /** Runs a step sequence once, for the Macro Studio's "Test" button —
   *  works on unsaved edits, same execution path a real macro press uses. */
  testMacroSteps(actions: MacroStep[]): Promise<TestActionResult>

  /**
   * Demo Mode — "the Noma Moment" (Product Development Phase 2). A
   * deterministic, repeatable walkthrough of the adaptive-interface story
   * for presentations and user testing. All three calls drive the exact
   * same context/workflow/suggestion pipeline real usage does — see
   * src/main/demo/demoService.ts.
   */
  /** Overrides the live application context (ignoring real OS detection
   *  until cleared) to one of the two seeded demo applications, or null to
   *  hand control back to real detection. */
  setDemoApplication(applicationId: 'code' | 'chrome' | null): Promise<void>
  /** Inserts a deterministic, backdated Copy -> Paste workflow, tuned to
   *  produce exactly one `repeatedSequence` suggestion once pattern
   *  detection re-runs. Not real captured keystrokes — see the doc comment
   *  in demoService.ts for the exact numbers and why. */
  simulateDemoWorkflow(): Promise<void>
  /** Restores Demo Mode to a clean, replayable state — clears workflow
   *  events/suggestions and resets the two demo profiles to their seeded
   *  defaults. Development/demo-only; never offered as a normal action. */
  resetDemoData(): Promise<void>

  /**
   * Privacy & data management (Settings page). See docs/privacy-and-legal.md.
   */
  /** Deletes everything Flow has observed and suggested (workflow_events,
   *  suggestions) — never touches profiles, controls, or macros, since
   *  those are the user's own configuration, not learning data. */
  clearLearningData(): Promise<void>
  /** Full factory reset: deletes every application/profile/control/macro/
   *  suggestion/workflow_event/setting and restores the seeded defaults —
   *  the same state a fresh install starts in. Irreversible. */
  deleteAllData(): Promise<void>

  /**
   * Module configuration (brainstorm.md section 10) — assigns a real,
   * executable action (plus a short display name, e.g. "Timeline Zoom") to
   * one of a module's capability functions (e.g. a Rotary Encoder's 'turn'/
   * 'press'). Keyed by function name so this generalizes to future module
   * types without a schema change. Returns the updated module, or null if
   * it doesn't exist.
   */
  configureModule(
    moduleId: string,
    configuration: Record<string, ModuleFunctionConfig>
  ): Promise<Module | null>

  /**
   * Developer Mode hardware bring-up tools (brainstorm.md section 20/
   * this phase's section 15). Every one of these calls into the real
   * VirtualHardwareDevice / event pipeline — never a separate fake path.
   */
  /** Round-trips a PING/PONG through the hardware layer. Real latency
   *  (near-zero in-process today; meaningful once a real transport exists). */
  pingHardware(): Promise<{ ok: boolean; latencyMs: number }>
  /** Cycles the virtual device through disconnect -> connect, a real state
   *  transition visible in the HOST<->DEVICE log. */
  resetHardware(): Promise<void>
  /** Simulates a physical encoder turn on the given module — the exact
   *  ENCODER_ROTATE DeviceEvent a real module will one day raise. */
  simulateEncoderRotation(moduleId: string, delta: number): Promise<void>
  /** Clears the in-memory HOST<->DEVICE log (main process and renderer). */
  clearDeviceLog(): Promise<void>

  /** First-launch onboarding. See onboardingRepository.ts. */
  getOnboardingState(): Promise<OnboardingState>
  /** Merges `update` into the persisted onboarding state and returns the
   *  result — every screen saves incrementally as the user moves through
   *  the flow, not just once at the end. */
  saveOnboardingState(update: Partial<OnboardingState>): Promise<OnboardingState>
}
