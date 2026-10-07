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
  /** Full path to the executable (e.g. `C:\...\chrome.exe`) when known —
   *  what real OS-icon extraction needs (see main/applications/iconService.ts).
   *  Populated for live-detected applications (windowsAdapter.ts); absent
   *  for seeded/demo applications that don't correspond to a real installed
   *  path until the real one is actually detected running (see
   *  applicationsRepository.ts's upsertApplication, which backfills this
   *  field in place without touching a seeded display name). */
  executablePath?: string
  icon?: string
}

export type ControlAction =
  /** An empty zone: nothing assigned, nothing runs. What "Clear" in the control editor leaves behind. */
  | { type: 'none' }
  | { type: 'shortcut'; keys: string[] }
  | { type: 'macro'; macroId: string }
  | { type: 'launchApplication'; applicationId: string }
  | { type: 'systemCommand'; command: string }
  | { type: 'flowAction'; action: string }
  /**
   * Switches to an already-running application by id, resolved to a
   * process name (applicationsRepository.getApplicationById) and focused
   * via the same SetForegroundWindow path windowFocus.ts already uses —
   * never spawns a process. This is deliberately narrower than
   * `launchApplication` (still unimplemented): "bring the window Windows
   * already has to the front" is a safe, bounded capability; "start an
   * arbitrary executable" is a much bigger surface this feature doesn't
   * need. Added for learned multi-step workflows (see `multiStepWorkflow`
   * below) whose steps include switching into another app — the one
   * step in that vocabulary `launchApplication` couldn't safely cover.
   */
  | { type: 'focusApplication'; applicationId: string }
  /**
   * Clicks inside the currently-focused window — the executable counterpart
   * to `WorkflowStep`'s own `click` (same `target` format: `label:<name>` or
   * `zone:<col>x<row>`, see clickTarget.ts). Added alongside real click
   * execution (main/actions/click.ts) so a learned workflow that includes a
   * click can actually be replayed, not just described. Only ever appears
   * inside a learned workflow macro's steps — the Control Mapping Editor's
   * action-type picker deliberately excludes it, the same way it already
   * excludes `focusApplication`: there's no on-screen picker for "click
   * here" that isn't itself a captured workflow step.
   *
   * A `label:` target is found again by name at replay time (UI Automation,
   * see main/actions/click.ts), so it survives a moved or resized window; a
   * `zone:` target is a position in the current window. `applicationId`,
   * when present, is the app the click was recorded in: replay refuses to
   * click unless that app is the one in front. Optional so macros saved
   * before it existed still run.
   */
  | { type: 'click'; target: string; applicationId?: string }

/** The macOS right-edge swipe (Notification Center): `supported` is false off macOS. */
export interface MacEdgeSwipeState {
  supported: boolean
  enabled: boolean
}

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

export type WorkflowEventType = 'shortcut' | 'sequence' | 'controlActivation' | 'appSwitch' | 'click'

export interface WorkflowEvent {
  id?: number
  /** For 'appSwitch', the application just switched *into* — same meaning
   *  as every other event kind's applicationId ("the context this happened
   *  in"), just that here the event itself *is* the context changing. */
  applicationId: string | null
  eventType: WorkflowEventType
  /** Command-modifier key combo only — never raw typed content. See captureFilter.ts. */
  comboKeys?: string[]
  controlId?: string
  /** For 'click': what was clicked inside the application — either
   *  `label:<button name>` (a sanitized UI Automation name for a button/
   *  menu item/tab, never text content) or `zone:<col>x<row>` (a coarse
   *  window-relative grid cell, for apps that don't expose their controls).
   *  See workflow/clickTarget.ts and docs/privacy-and-legal.md. */
  clickTarget?: string
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
   * WORKFLOW LEARNING (see `multiStepWorkflow` and `crossAppWorkflow`
   * below): turns a recognized chain into a real macro and assigns it to a
   * control. `steps` is the detected chain itself (screenshot, switch app,
   * paste, ...); suggestionResolution.ts converts each step into a
   * MacroStep (shortcut -> shortcut, appSwitch -> focusApplication, click ->
   * click), drops a trailing appSwitch (the "and switches back" tail is
   * what the workflow leads to, not part of *doing* it), and appends a
   * submit keystroke when the chain ends in a paste.
   *
   * `stepDelaysMs`, when present, is index-aligned with `steps` — the real
   * gap (in ms) observed before that step, taken from one actual occurrence
   * (the representative one for `multiStepWorkflow`, the median for
   * `crossAppWorkflow`) rather than invented. `stepDelaysMs[0]` is always
   * meaningless (nothing precedes the first step) and ignored.
   * suggestionResolution.ts turns the gaps into real `delay` MacroSteps, so
   * pressing the resulting control reproduces the pace the user actually
   * worked at, not everything fired back-to-back.
   */
  | { kind: 'createWorkflowMacroAndAssignToControl'; steps: WorkflowStep[]; stepDelaysMs?: number[] }

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
  /** The application's current display name (e.g. "Visual Studio Code"),
   *  resolved live from `applicationId` on every read (not persisted, so it
   *  can never go stale the way a frozen-at-creation-time copy could) —
   *  null if `applicationId` is null, or if that id has no matching row
   *  (a pattern from an application Flow hasn't recorded yet). This is
   *  what the Suggestions panel shows as "in <app>"; `explanation` also
   *  bakes the name in as prose, resolved once at generation time. */
  applicationName?: string | null
  /** Absent for suggestions created before this field existed. */
  action?: SuggestionAction
  /** Absent for suggestions created before this field existed, or for
   *  pattern kinds that don't carry one (there are none today, but a future
   *  AIProvider isn't required to supply it). */
  confidenceBreakdown?: ConfidenceBreakdown
  /** Resolved display names for every application a multi-application
   *  chain (`crossAppWorkflow`/`multiStepWorkflow`) touches, keyed by
   *  application id — the same lookup `explanation`'s prose already bakes
   *  in, persisted here too so a UI rendering the chain *visually* (see
   *  `WorkflowChain` in the renderer) can show "Claude Code" instead of the
   *  raw id `claude`. Absent for single-application suggestion kinds, and
   *  for suggestions created before this field existed. */
  chainApplicationNames?: Record<string, string | null>
  /** How many times Flow has observed the pattern behind this suggestion,
   *  refreshed on every detection pass while the suggestion is pending.
   *  Noma Notice's repetition threshold reads this. Absent for suggestions
   *  created before the column existed. */
  occurrenceCount?: number
  /** When this workflow was announced by Noma Notice, if it ever was —
   *  what stops the same one being announced twice. */
  notifiedAt?: number
  /** Produced by Demo Mode's scripted events, not learned from the user.
   *  Shown with a "Demo" label, never presented as something Noma noticed. */
  isDemo?: boolean
}

/**
 * What Noma Notice shows: a workflow Flow has recognized often enough to be
 * worth mentioning while the user is working in some other application.
 *
 * Carries the whole `Suggestion` rather than a flattened copy of it, so the
 * notice renders through exactly the same `workflowChainSteps` ->
 * `WorkflowChain` path the in-app Noma Moment does — one description of what
 * a workflow looks like, not two that can drift apart.
 */
export interface WorkflowNotice {
  suggestion: Suggestion
  /** How many repeats Flow had seen when it decided to surface this. */
  occurrenceCount: number
}

/**
 * One keyboard shortcut Flow has observed being pressed, aggregated across
 * *all* recorded history (not just today) — the Usage Stats page's main
 * list. Keyed by the exact combo + application it happened in, so the same
 * combo used in two different apps is tracked separately, matching how
 * patternDetection.ts already scopes everything per-app.
 *
 * Deliberately scoped to `shortcut` events only, not `controlActivation` —
 * a control's own label can be renamed or its profile deleted entirely,
 * which would leave a `controlId`-keyed stat with nothing stable to display
 * (unlike `applicationName`, there's no live join that could keep it
 * accurate). A raw key combo has no such staleness problem.
 */
export interface ShortcutUsageStat {
  id: string
  comboKeys: string[]
  applicationId: string | null
  /** Live-resolved from `applicationId`, same staleness-free join
   *  `Suggestion.applicationName` uses. Null if never seen in any app. */
  applicationName: string | null
  count: number
  firstUsed: number
  lastUsed: number
}

/**
 * One control's press history, aggregated across all recorded history —
 * how many times it's been used and when it was last reached for. Keyed
 * by `controlId` (stable across a relabel/reassignment, unlike a slot
 * number, which is reused by whatever control currently occupies it) —
 * the Controls page's "Used 14 times" line for both manually-configured
 * and Noma-learned controls alike.
 */
export interface ControlUsageStat {
  controlId: string
  count: number
  firstUsed: number
  lastUsed: number
}

/** Total shortcut-press counts per local calendar day, oldest first — the
 *  Usage Stats page's activity-over-time chart. `date` is a local
 *  `YYYY-MM-DD` key (see `localDateKey`), not UTC, so "today" always lines
 *  up with what `startOfTodayMs` considers today. */
export interface DailyActivityCount {
  date: string
  count: number
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
 * Which physical/virtual input Flow should treat as the user's "keyboard"
 * right now. Not everyone owns (or wants to buy) the real module, so 'holo'
 * is a second, free, no-hardware option: swiping a finger onto the
 * trackpad from beside it (main/holo/trackpadGesture.ts). Both drive the
 * exact same 4 `Control` slots via `pressControl`; this only decides which
 * *source* is allowed to fire that call. Manually chosen today (Settings);
 * real hardware-presence auto-detection is a documented future step, not
 * implemented yet (see docs/architecture.md).
 */
export type InputSource = 'keyboard' | 'holo'

/** Where a trackpad swipe-in came from: the left or right side, upper or
 *  lower half. Mapped to control slots 1-4 (the renderer's
 *  TRACKPAD_ZONE_SLOTS). With two zones only the `top*` ones are used and
 *  the whole side counts. */
export type HoloTrackpadZone = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'

/** 2: left / right (slots 1-2). 4: each side split into halves (slots 1-4). */
export type HoloTrackpadZoneCount = 2 | 4

/** A swipe-in fired, or a finger came in from a side but didn't count. */
export type HoloTrackpadEvent =
  | { type: 'fire'; zone: HoloTrackpadZone; at: number }
  | {
      type: 'miss'
      zone: HoloTrackpadZone
      at: number
      reason: 'too-slow' | 'not-sideways' | 'second-finger' | 'palm' | 'typing' | 'click'
    }

/** Where software updates stand (main/updater.ts). */
export type UpdatePhase =
  /** A development or test build: updates don't apply. */
  | 'unavailable'
  | 'idle'
  | 'checking'
  | 'up-to-date'
  /** Newer version out, but this copy can't install it itself (an unsigned
   *  Mac build): the user downloads it. */
  | 'available'
  | 'downloading'
  /** Downloaded; installs when Noma quits, or now via installUpdate(). */
  | 'ready'
  /** The last check the user asked for failed (usually offline). */
  | 'error'

/** Shown once after Noma updates: the notes for every version since the
 *  one the user last saw (shared/releaseNotes.ts), newest first. */
export interface WhatsNew {
  version: string
  releases: Array<{ version: string; notes: string[] }>
}

export interface UpdateStatus {
  phase: UpdatePhase
  currentVersion: string
  /** The newer version, once one is found. */
  version: string | null
  /** 0 to 100 while downloading. */
  percent: number | null
  /** When a check last finished, successfully or not (epoch ms). */
  lastCheckedAt: number | null
}

/** Glide's state. Owned by main (stored in settings), so it survives
 *  restarts and works with Noma's window closed to the tray. */
export interface GlideState {
  enabled: boolean
  zoneCount: HoloTrackpadZoneCount
  /** Glide can run here at all: Windows, with raw touchpad input. */
  platformSupported: boolean
  /** Precision touchpads found the last time Glide started or checked;
   *  null when it hasn't looked yet. */
  touchpads: number | null
  /** Why Glide couldn't start, in plain words; null when fine. */
  error: string | null
}

/** What a recognised swipe-in came to. `practice`: Noma's own window was in
 *  front, so nothing ran (the app behind it would have got the press, out of
 *  sight). `paused`: a touch check was recording. `busy`: another action was
 *  still running. */
export type GlideOutcome = 'pressed' | 'practice' | 'no-app' | 'no-control' | 'paused' | 'busy'

/** One swipe-in, pushed to the renderer for feedback. */
export type GlideActivity =
  | {
      type: 'fire'
      zone: HoloTrackpadZone
      slot: number
      at: number
      outcome: GlideOutcome
      controlLabel?: string
      applicationName?: string
    }
  | Extract<HoloTrackpadEvent, { type: 'miss' }>

/** Whether an action (a control press or an editor Test) is running now. */
export interface ActionRunState {
  running: boolean
  label?: string
  startedAt?: number
}

/** One step of what an approved workflow will do, in the order it runs. */
export interface WorkflowPreviewStep {
  /** Plain words: "Press Ctrl+D", "Switch to Google Chrome", "Wait 0.6 s". */
  description: string
  kind: 'shortcut' | 'focus' | 'click' | 'wait' | 'other'
  /** Added by Noma rather than seen (e.g. Enter after a final paste). */
  added?: boolean
  /** Why this step may not replay reliably, in plain words. */
  warning?: string
}

/** What accepting a suggestion would save, shown before the user agrees. */
export interface WorkflowPreview {
  steps: WorkflowPreviewStep[]
  /** No step carries a warning (as far as Noma can tell beforehand). */
  replayable: boolean
}

export interface HoloTrackpadStatus {
  /** Precision touchpads found (swipe-ins need at least one). */
  touchpads: number
}

/**
 * The trackpad touch check's result (Holo page): what the user's own
 * swipe-ins and ordinary trackpad use looked like, measured, and what the
 * current swipe-in rules would have done with them.
 */
export interface HoloTouchCheckSummary {
  phases: Array<{
    kind: 'left' | 'right' | 'normal'
    /** Separate finger touches in this phase. */
    touches: number
    /** Of those, how many were first seen within the swipe-in edge band. */
    startedAtEdge: number
    /** Where touches were first seen, as distance from the phase's side
     *  (fraction of the pad's width): min / median / max. Null in the
     *  ordinary-use phase or with no touches. */
    firstEdgeDistance: [number, number, number] | null
    /** Share of first contacts the touchpad already called a finger
     *  (not a palm). */
    firstConfident: number
    /** What the current rules did: fires (and on the right side), and
     *  misses by reason. */
    fires: number
    firesOnSide: number
    misses: Record<string, number>
  }>
}

/**
 * One step in a recognized cross-app workflow chain — either the app you
 * switched into, or a shortcut you pressed once there. Built entirely from
 * already-captured, already-sanitized WorkflowEvent fields (patternDetection.ts's
 * detectCrossAppWorkflows) — never anything richer, e.g. no window title.
 */
export type WorkflowStep =
  | { type: 'appSwitch'; applicationId: string | null }
  | { type: 'shortcut'; applicationId: string | null; comboKeys: string[] }
  /** A click on an on-screen control inside the application — `target` is
   *  `label:<name>` or `zone:<col>x<row>` (WorkflowEvent.clickTarget). */
  | { type: 'click'; applicationId: string | null; target: string }

/**
 * A repeated-behavior pattern found by the deterministic pattern-detection
 * engine (brainstorm.md section 11) over already-captured, already-sanitized
 * WorkflowEvent metadata. Never derived from anything but comboKeys/
 * controlId/applicationId/timestamp — see docs/privacy-and-legal.md.
 *
 * Discriminated on `kind` so the suggestion engine (Phase 5) can pull the
 * specific structured data (comboKeys/sequence/controlId/steps) it needs to
 * write suggestion copy, instead of parsing the human-readable `description`.
 */
export type PatternKind =
  | 'repeatedShortcut'
  | 'repeatedSequence'
  | 'frequentControl'
  | 'crossAppWorkflow'
  | 'multiStepWorkflow'

interface DetectedPatternBase {
  id: string
  applicationId: string | null
  description: string
  count: number
  /** How many separate sittings (occurrences more than 5 minutes apart) the
   *  pattern's counted repeats fall into. A pattern whose every repeat is
   *  inside one burst is much more likely a one-off than a habit — a
   *  self-derived quality signal (main/ai/workflowQuality.ts) needing no
   *  user feedback. */
  sessionCount?: number
}

export type DetectedPattern =
  | (DetectedPatternBase & { kind: 'repeatedShortcut'; comboKeys: string[] })
  | (DetectedPatternBase & { kind: 'repeatedSequence'; sequence: string[] })
  | (DetectedPatternBase & { kind: 'frequentControl'; controlId: string })
  | (DetectedPatternBase & {
      kind: 'crossAppWorkflow'
      /** The two steps that make up the recognized chain, in order — at
       *  least one is always an 'appSwitch' (a same-app pair of shortcuts
       *  is repeatedSequence's job, not this). */
      steps: [WorkflowStep, WorkflowStep]
      /** Every distinct application touched by `steps`, in first-seen
       *  order. Resolving display names for the whole chain needs all of
       *  them, unlike every other pattern kind's single `applicationId`. */
      applicationIds: Array<string | null>
      /** The step that, across multiple completed repeats of this chain,
       *  consistently followed it — e.g. switching to a git client right
       *  after several rounds of pasting into an editor. Absent when no
       *  consistent follow-up was found. */
      closingStep?: WorkflowStep
      /** The real (median-of-occurrences) gap before `steps[1]`, in ms — see
       *  `SuggestionAction.createWorkflowMacroAndAssignToControl`'s doc
       *  comment. `[0]` is a placeholder (nothing precedes `steps[0]`). */
      stepDelaysMs?: [number, number]
    })
  | (DetectedPatternBase & {
      /**
       * WORKFLOW LEARNING — Noma's core differentiator. A recurring chain of
       * 3+ meaningful steps (any mix of appSwitch/shortcut), possibly
       * spanning several applications, recognized with *approximate*
       * matching (patternDetection.ts's detectMultiStepWorkflows) so minor,
       * naturally-occurring variation between repeats — an extra uncaptured
       * keystroke, one repeat missing a step another had — doesn't stop it
       * from being recognized as "the same workflow." Like `crossAppWorkflow`
       * (its fixed-length, 2-step sibling), this kind's suggestion carries a
       * real executable action — see `SuggestionAction`'s
       * `createWorkflowMacroAndAssignToControl`.
       */
      kind: 'multiStepWorkflow'
      /** The recognized chain itself, in order — the cluster's representative
       *  (most information-preserving) form, not any single raw occurrence. */
      steps: WorkflowStep[]
      /** Every distinct application touched by `steps`, in first-seen order. */
      applicationIds: Array<string | null>
      /** The application the chain *starts* in — where the resulting
       *  control is offered (suggestionRules.ts sets the suggestion's
       *  `applicationId` to this), matching how the product is meant to
       *  feel: the new control shows up alongside the other controls for
       *  the app you were already in, not a floating global action. */
      contextApplicationId: string | null
      /** Fraction (0-1) of this pattern's occurrences that matched the
       *  representative chain exactly, vs. only approximately (one step
       *  inserted/missing) — a consistency signal folded into the
       *  suggestion's confidence (STEP 4: "the detector must prioritize
       *  semantically meaningful sequences," not just any recurring blob). */
      consistency: number
      /** The real gaps (ms) before each step in `steps`, taken from one
       *  actual representative occurrence — see `crossAppWorkflow`'s
       *  `stepDelaysMs` doc comment; same meaning, just index-aligned with
       *  this kind's variable-length `steps` instead of a fixed pair. */
      stepDelaysMs?: number[]
    })

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
/** v0.1 onboarding: what Noma is, try Glide, Flow opt-in, first real
 *  action. A step id saved by an older build reads as 'welcome'. */
export type OnboardingStepId = 'welcome' | 'glide' | 'flow' | 'firstAction'

export interface OnboardingState {
  completed: boolean
  /** The last screen reached — lets a relaunch mid-onboarding resume there
   *  instead of restarting from Welcome. */
  step: OnboardingStepId
  /** Kept for older saved states; v0.1 onboarding doesn't ask. */
  selectedUseCases: string[]
  flowEnabled: boolean
  /** Kept for older saved states; v0.1 onboarding doesn't ask. */
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
  /** Opt-in, separate from workflow monitoring: also learn from which
   *  on-screen buttons you click inside apps. Off by default. */
  getClickCaptureEnabled(): Promise<boolean>
  setClickCaptureEnabled(enabled: boolean): Promise<boolean>
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
  /** Every shortcut Flow has ever recorded, aggregated by combo + application,
   *  most-used first — the Usage Stats page's main list. See ShortcutUsageStat. */
  getShortcutUsageStats(): Promise<ShortcutUsageStat[]>
  /** Every control's all-time press count, keyed by controlId — the
   *  Controls page's "Used N times" line. See ControlUsageStat. */
  getControlUsageStats(): Promise<ControlUsageStat[]>
  /** Shortcut-press counts per local day for the last `days` days (inclusive
   *  of today), oldest first, zero-filled for days with no activity — the
   *  Usage Stats page's activity chart. */
  getDailyActivityCounts(days: number): Promise<DailyActivityCount[]>
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
  clearControl(applicationId: string, slot: number): Promise<ApplicationProfile | null>
  /** Runs a control action once, against whatever the last known real
   *  application was, without saving it to any control. Same execution
   *  path and same safety rules (closed vocabulary, blocklist, fail-closed
   *  focus) as a real press. */
  testControlAction(action: ControlAction): Promise<TestActionResult>
  /** All macros, for the editor's macro picker and the Macro Studio's list. */
  getMacros(): Promise<Macro[]>
  /** All known applications, for the Macro Studio's "assign to control" and launch-application pickers. */
  getAllApplications(): Promise<Application[]>
  /**
   * The real OS-extracted icon for an application's executable, as a
   * renderer-safe PNG data URL (`data:image/png;base64,...`) — Electron's
   * `app.getFileIcon` under the hood, cached in the main process by
   * normalized path (see iconService.ts). Works for *any* installed
   * application, not just ones in this app's own hand-drawn icon registry
   * (`lib/appIcons.ts`) — that registry is only a fallback for when this
   * returns null (unknown path, or Windows couldn't resolve an icon for
   * it). Never throws.
   */
  getApplicationIcon(executablePath: string): Promise<string | null>

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
   *  — shown as a warning before deleting one that's still in use, and (via
   *  `controlId` + `getControlUsageStats`) used by the Controls page to show
   *  a learned action's real usage count. */
  getControlsReferencingMacro(macroId: string): Promise<
    Array<{ controlId: string; applicationId: string; applicationName: string; slot: number; label: string }>
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
  /** Inserts a deterministic, backdated Bookmark -> Close tab workflow, tuned to
   *  produce exactly one `repeatedSequence` suggestion once pattern
   *  detection re-runs. Not real captured keystrokes — see the doc comment
   *  in demoService.ts for the exact numbers and why. */
  simulateDemoWorkflow(): Promise<void>
  /** WORKFLOW LEARNING's flagship demo: inserts a deterministic, backdated
   *  "screenshot -> switch to Claude Code -> paste -> switch back"
   *  repetition, tuned to produce exactly one `multiStepWorkflow`
   *  suggestion once pattern detection re-runs. See demoService.ts's
   *  simulateDemoMultiStepWorkflow doc comment for the exact numbers and
   *  why the live application context deliberately stays on VS Code. */
  simulateDemoMultiStepWorkflow(): Promise<void>
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

  /** Opens the folder touch checks are saved in (Noma's own, on this
   *  computer). */
  openHoloRecordings(): Promise<void>
  /** Glide: the trackpad swipe-in. On/off and zone count are stored by main
   *  and take effect immediately, with or without this window open. */
  getGlideState(): Promise<GlideState>
  /** macOS only: whether the system's swipe-in-from-the-right-edge gesture (Notification Center) is on, which clashes with Glide's right zones. */
  getMacEdgeSwipe(): Promise<MacEdgeSwipeState>
  setMacEdgeSwipe(enabled: boolean): Promise<MacEdgeSwipeState>
  setGlideEnabled(enabled: boolean): Promise<GlideState>
  setGlideZoneCount(zoneCount: HoloTrackpadZoneCount): Promise<GlideState>
  onGlideState(callback: (state: GlideState) => void): () => void
  onGlideActivity(callback: (activity: GlideActivity) => void): () => void

  /** The action running right now, if any, and a way to stop it between
   *  steps. Stopping never undoes steps that already ran. */
  getActionRunState(): Promise<ActionRunState>
  onActionRunState(callback: (state: ActionRunState) => void): () => void
  cancelRunningAction(): Promise<boolean>

  /** Removes a saved workflow and puts every control it was on back to its
   *  starter action (or an empty slot). False when there's no such workflow. */
  removeWorkflow(macroId: string): Promise<boolean>
  /** The exact steps accepting this suggestion would save, before anything
   *  is saved. Null when the suggestion has no action. */
  previewSuggestionAction(suggestionId: string): Promise<WorkflowPreview | null>

  /** Beta issue reports: a plain-text summary of this install (versions,
   *  touchpad, settings, recent action results, never what was typed or
   *  clicked) for the tester to read and paste themselves. Never sent. */
  getDiagnosticsReport(): Promise<string>
  /** Opens the website's report form in the browser, with nothing attached. */
  openIssuePage(): Promise<void>
  /** Software updates. Updates are also checked on their own every few
   *  hours; checkForUpdates() just runs a check now. */
  getUpdateStatus(): Promise<UpdateStatus>
  checkForUpdates(): Promise<UpdateStatus>
  /** Quits and installs a downloaded update (phase 'ready'). */
  installUpdate(): Promise<void>
  /** Opens the download page, for a copy that can't update itself. */
  openUpdateDownload(): Promise<void>
  onUpdateStatus(callback: (status: UpdateStatus) => void): () => void
  /** What changed since the last version this user saw, when this launch
   *  follows an update; null otherwise (including a fresh install). */
  getWhatsNew(): Promise<WhatsNew | null>
  /** Closes the note for good: it won't show again until the next update. */
  dismissWhatsNew(): Promise<void>
  /** The trackpad touch check: records finger positions (dry run, nothing
   *  fires) until stopped, then saves them on this computer and returns a
   *  summary. `phases` are the guided steps, in Date.now() time. */
  startHoloTouchCheck(): Promise<HoloTrackpadStatus | null>
  /** When the last touch check was saved (ms), or null if never. */
  getHoloTouchCheckLast(): Promise<number | null>
  stopHoloTouchCheck(
    phases: Array<{ kind: 'left' | 'right' | 'normal'; startAt: number; endAt: number }>
  ): Promise<{ summary: HoloTouchCheckSummary; savedTo: string } | null>

  /**
   * Noma Notice. The first three are used only by the notice's own window;
   * the last is a Demo Mode trigger and is never reachable from normal UI.
   */
  onWorkflowNoticeShown(callback: (notice: WorkflowNotice) => void): () => void
  /** What the notice window should be showing right now, asked on mount. */
  getPendingWorkflowNotice(): Promise<WorkflowNotice | null>
  /** Closes the notice. `reason` records what the user did, so "Not now"
   *  marks the workflow dismissed while a timeout — or an X, which is a
   *  verdict on the interruption, not on the workflow — leaves it untouched. */
  dismissWorkflowNotice(
    suggestionId: string,
    reason: 'timeout' | 'closed' | 'dismissed' | 'reviewed'
  ): Promise<void>
  /** Lets the notice's window take clicks while the pointer is over the
   *  card, and pass them straight through to the desktop otherwise. */
  setWorkflowNoticeInteractive(interactive: boolean): Promise<void>
  /** Opens the main Noma window on this suggestion (used when accepting it
   *  needs a control slot picked, which the small notice deliberately
   *  doesn't try to do). */
  reviewWorkflowNoticeInApp(suggestionId: string): Promise<void>
  simulateWorkflowNotice(): Promise<void>
  /** Main window only: fires when a notice's "Add to Noma" needs the
   *  full review UI (picking a control slot). */
  onOpenSuggestionInApp(callback: (suggestionId: string) => void): () => void
}
