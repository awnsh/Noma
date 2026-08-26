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

export interface Suggestion {
  id: string
  title: string
  explanation: string
  confidence: number
  status: SuggestionStatus
  createdAt: number
  resolvedAt?: number
}

export interface Macro {
  id: string
  name: string
  applicationId?: string
  trigger: string
  actions: string[]
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
  deviceType: 'virtual' | 'usb' | 'serial'
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
 */
export type PatternKind = 'repeatedShortcut' | 'repeatedSequence' | 'frequentControl'

export interface DetectedPattern {
  id: string
  kind: PatternKind
  applicationId: string | null
  description: string
  count: number
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
  /** Simulates a physical press of the given control on the virtual keyboard. */
  pressControl(controlId: string): Promise<void>
  addModule(moduleType: string): Promise<void>
  removeModule(moduleId: string): Promise<void>
  /** Whether Flow is currently watching for command-modifier shortcuts. Off by default. */
  getWorkflowMonitoringEnabled(): Promise<boolean>
  /** Enables/disables workflow monitoring, engaging or releasing the OS-level hook. Returns the new state. */
  setWorkflowMonitoringEnabled(enabled: boolean): Promise<boolean>
  getDetectedPatterns(): Promise<DetectedPattern[]>
}
