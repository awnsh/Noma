import { PROTOCOL_VERSION } from '@shared/constants'
import type { Control, DeviceEvent, DeviceLogEntry, DeviceStatus, LEDState, Module } from '@shared/types'
import type { HardwareDevice } from './types'

const MAX_LOG_ENTRIES = 100
const DEFAULT_STATUS_TIMEOUT_MS = 2000
const DEFAULT_PING_TIMEOUT_MS = 1000

/**
 * A single line of text in, a single line of text out — the entire
 * dependency SerialHardwareDevice has on an actual serial port. Kept this
 * narrow specifically so the protocol logic below (the part worth testing)
 * never needs a real port, or the native `serialport` module, to run its
 * tests — see serialDevice.test.ts, which drives everything through an
 * in-memory fake transport instead. `serialTransport.ts`'s
 * `openSerialPort()` is the one place that wraps a real port into this
 * shape; nothing else in this file knows a real port exists.
 */
export interface LineTransport {
  /** Writes one already-JSON-encoded line. The transport (not the caller)
   *  is responsible for framing — appending the trailing newline the wire
   *  format (docs/hardware-protocol.md) requires. */
  write(line: string): void
  /** Fires once per received line, newline already stripped. Returns an
   *  unsubscribe function. */
  onLine(callback: (line: string) => void): () => void
  close(): void
}

interface WireMessage {
  type: string
  payload?: unknown
}

/**
 * SerialHardwareDevice — the first real (non-virtual) `HardwareDevice`
 * implementation (docs/product-audit.md's "hardware-readiness" gap;
 * docs/hardware-protocol.md's proposed real transport). Speaks the exact
 * line-delimited JSON vocabulary that document specifies and
 * VirtualHardwareDevice already exercises in-process today — same message
 * names, same payload shapes, just over a real wire instead of an
 * in-memory call. `firmware/noma_device/noma_device.ino` is the device-side
 * half of this same contract.
 *
 * Deliberately NOT wired into main/index.ts's getDefaultHardwareDevice()
 * yet — same posture as the STM32HardwareDevice stub this supersedes, for
 * a real reason rather than caution alone: the Virtual Keyboard page's
 * "simulate a press / add a module" tools (pressControl/addModuleByType/
 * removeModule/configureModule, called directly on the concrete device by
 * src/main/ipc/handlers.ts) are software-only concepts with no equivalent
 * on a device that has real physical buttons and no module bus yet.
 * Deciding whether/how those UI affordances coexist with a real attached
 * device is a product decision for once real hardware is actually in hand
 * to point at — not something this class should resolve unilaterally by
 * quietly becoming the default. Bring-up tooling (getLog/ping/reset) IS
 * meaningfully real here — a ping round-trips over the actual wire, not an
 * in-process no-op — so those are implemented for real, matching
 * brainstorm.md section 20's "Developer Mode exercises real hardware"
 * intent.
 *
 * "Refocus, but verify, or refuse" (docs/architecture.md) applies here
 * too: connect() only ever reports success once a real device has actually
 * answered GET_STATUS with a compatible protocol version — never just
 * because the serial port happened to open. Fails closed on a major
 * version mismatch per hardware-protocol.md's versioning note, rather than
 * guessing at compatibility.
 */
export class SerialHardwareDevice implements HardwareDevice {
  private connected = false
  private controls: Control[] = []
  private displays: Record<string, string> = {}
  private modules: Module[] = [] // no module-registration protocol over this transport yet
  private log: DeviceLogEntry[] = []

  private readonly statusTimeoutMs: number
  private readonly pingTimeoutMs: number

  private deviceEventListeners = new Set<(event: DeviceEvent) => void>()
  private statusListeners = new Set<(status: DeviceStatus) => void>()
  private logListeners = new Set<(entry: DeviceLogEntry) => void>()
  private unsubscribeLine: (() => void) | null = null
  private pendingStatus: Array<(status: DeviceStatus | null) => void> = []
  private pendingPong: Array<() => void> = []

  constructor(
    private readonly transport: LineTransport,
    options: { statusTimeoutMs?: number; pingTimeoutMs?: number } = {}
  ) {
    this.statusTimeoutMs = options.statusTimeoutMs ?? DEFAULT_STATUS_TIMEOUT_MS
    this.pingTimeoutMs = options.pingTimeoutMs ?? DEFAULT_PING_TIMEOUT_MS
  }

  async connect(): Promise<void> {
    if (this.connected) return
    this.unsubscribeLine = this.transport.onLine(this.handleLine)

    const status = await this.requestStatus()
    if (!status) {
      this.teardownLine()
      throw new Error('Opened the serial port, but no Noma device answered GET_STATUS.')
    }
    if (majorVersion(status.protocolVersion) !== majorVersion(PROTOCOL_VERSION)) {
      this.teardownLine()
      throw new Error(
        `Refusing to connect: device reports protocol v${status.protocolVersion}, host expects v${PROTOCOL_VERSION} (major version mismatch).`
      )
    }

    this.connected = true
    this.controls = status.controls
    this.displays = status.displays
    this.modules = status.modules
    this.pushLog('toDevice', 'CONNECT')
    this.emitStatus()
  }

  async disconnect(): Promise<void> {
    this.teardownLine()
    this.connected = false
    this.pushLog('toDevice', 'DISCONNECT')
    this.emitStatus()
  }

  async setControls(controls: Control[]): Promise<void> {
    this.controls = controls
    this.write({ type: 'SET_CONTROLS', payload: controls })
    this.pushLog('toDevice', 'SET_CONTROLS', `${controls.length} control(s)`)
    this.emitStatus()
  }

  async updateDisplay(displayId: string, content: string): Promise<void> {
    this.displays = { ...this.displays, [displayId]: content }
    this.write({ type: 'SET_DISPLAY', payload: { displayId, content } })
    this.pushLog('toDevice', 'SET_DISPLAY', `${displayId}: "${content}"`)
    this.emitStatus()
  }

  async setLEDState(ledId: string, state: LEDState): Promise<void> {
    this.write({ type: 'SET_LED', payload: { ledId, state } })
    this.pushLog(
      'toDevice',
      'SET_LED',
      `${ledId}: ${state.on ? 'on' : 'off'}${state.color ? ` (${state.color})` : ''}`
    )
  }

  async sendCommand(command: string, payload?: unknown): Promise<void> {
    this.write({ type: 'COMMAND', payload: { command, payload } })
    this.pushLog('toDevice', 'COMMAND', command)
  }

  async getStatus(): Promise<DeviceStatus> {
    // Returns the local mirror (kept current by connect() and by every
    // subsequent DEVICE_STATUS push) rather than round-tripping the wire on
    // every call — same synchronous-feeling contract VirtualHardwareDevice
    // gives callers, just backed by real state instead of in-memory state.
    return {
      connected: this.connected,
      deviceType: 'serial',
      protocolVersion: PROTOCOL_VERSION,
      controls: this.controls,
      displays: this.displays,
      modules: this.modules
    }
  }

  onDeviceEvent(callback: (event: DeviceEvent) => void): () => void {
    this.deviceEventListeners.add(callback)
    return () => {
      this.deviceEventListeners.delete(callback)
    }
  }

  onStatusChanged(callback: (status: DeviceStatus) => void): () => void {
    this.statusListeners.add(callback)
    return () => {
      this.statusListeners.delete(callback)
    }
  }

  /** Returns an unsubscribe function. Same shape as VirtualHardwareDevice's
   *  — Developer Mode's live log view doesn't need to know which
   *  implementation it's looking at. */
  onLogEntry(callback: (entry: DeviceLogEntry) => void): () => void {
    this.logListeners.add(callback)
    return () => {
      this.logListeners.delete(callback)
    }
  }

  getLog(): DeviceLogEntry[] {
    return this.log
  }

  clearLog(): void {
    this.log = []
  }

  /** Round-trips a real PING/PONG over the wire — unlike
   *  VirtualHardwareDevice's near-instant in-process version, this measures
   *  actual serial latency and can genuinely time out if nothing answers. */
  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now()
    this.pushLog('toDevice', 'PING')
    if (!this.connected) return { ok: false, latencyMs: Date.now() - start }

    this.write({ type: 'PING' })
    const gotPong = await this.waitForPong()
    const latencyMs = Date.now() - start
    if (gotPong) this.pushLog('fromDevice', 'PONG', `${latencyMs}ms`)
    return { ok: gotPong, latencyMs }
  }

  /** Cycles the real connection: tears down the line, then re-runs the full
   *  GET_STATUS handshake — a genuine reconnect, not just a state flip. */
  async reset(): Promise<void> {
    await this.disconnect()
    await this.connect()
  }

  private requestStatus(): Promise<DeviceStatus | null> {
    this.write({ type: 'GET_STATUS' })
    this.pushLog('toDevice', 'GET_STATUS')
    return new Promise((resolve) => {
      this.pendingStatus.push(resolve)
      setTimeout(() => {
        const index = this.pendingStatus.indexOf(resolve)
        if (index !== -1) {
          this.pendingStatus.splice(index, 1)
          resolve(null)
        }
      }, this.statusTimeoutMs)
    })
  }

  private waitForPong(): Promise<boolean> {
    return new Promise((resolve) => {
      const onPong = (): void => resolve(true)
      this.pendingPong.push(onPong)
      setTimeout(() => {
        const index = this.pendingPong.indexOf(onPong)
        if (index !== -1) {
          this.pendingPong.splice(index, 1)
          resolve(false)
        }
      }, this.pingTimeoutMs)
    })
  }

  private readonly handleLine = (line: string): void => {
    const trimmed = line.trim()
    if (!trimmed) return

    let message: WireMessage
    try {
      message = JSON.parse(trimmed) as WireMessage
    } catch {
      return // a corrupted/partial line — ignore, the next line resyncs
    }
    if (typeof message !== 'object' || message === null || typeof message.type !== 'string') return

    switch (message.type) {
      case 'BUTTON_PRESS': {
        const payload = message.payload as { controlId?: unknown; slot?: unknown } | undefined
        if (payload && typeof payload.controlId === 'string' && typeof payload.slot === 'number') {
          this.emitDeviceEvent({ type: 'buttonPress', controlId: payload.controlId, slot: payload.slot })
        }
        return
      }
      case 'ENCODER_ROTATE': {
        const payload = message.payload as { moduleId?: unknown; delta?: unknown } | undefined
        if (payload && typeof payload.moduleId === 'string' && typeof payload.delta === 'number') {
          this.emitDeviceEvent({ type: 'encoderRotate', moduleId: payload.moduleId, delta: payload.delta })
        }
        return
      }
      case 'MODULE_CONNECTED': {
        const payload = message.payload as { module?: Module } | undefined
        if (payload?.module) {
          this.modules = [...this.modules, payload.module]
          this.emitDeviceEvent({ type: 'moduleConnected', module: payload.module })
          this.emitStatus()
        }
        return
      }
      case 'MODULE_DISCONNECTED': {
        const payload = message.payload as { moduleId?: unknown } | undefined
        if (payload && typeof payload.moduleId === 'string') {
          const moduleId = payload.moduleId
          this.modules = this.modules.filter((module) => module.id !== moduleId)
          this.emitDeviceEvent({ type: 'moduleDisconnected', moduleId })
          this.emitStatus()
        }
        return
      }
      case 'DEVICE_STATUS': {
        const status = message.payload as DeviceStatus | undefined
        if (!status) return
        this.pushLog('fromDevice', 'DEVICE_STATUS')

        const waiters = this.pendingStatus.splice(0, this.pendingStatus.length)
        for (const resolve of waiters) resolve(status)

        // An unsolicited DEVICE_STATUS — the device announcing its own
        // state change, not just replying to a GET_STATUS this class asked
        // for — still updates the local mirror and notifies listeners.
        // During the initial connect() handshake `this.connected` is still
        // false at this exact point (connect() flips it right after this
        // resolves), so this branch only ever fires for a later, genuinely
        // unsolicited push, avoiding a double status update on handshake.
        if (this.connected) {
          this.controls = status.controls
          this.displays = status.displays
          this.modules = status.modules
          this.emitStatus()
        }
        return
      }
      case 'PONG': {
        const waiters = this.pendingPong.splice(0, this.pendingPong.length)
        for (const resolve of waiters) resolve()
        return
      }
      default:
        // Unknown message type — ignore rather than throw. A future
        // firmware/protocol revision may send something this build
        // predates; failing open here (skip it) is safer than crashing the
        // host process over one line it doesn't recognize yet.
        return
    }
  }

  private write(message: WireMessage): void {
    this.transport.write(JSON.stringify(message))
  }

  private teardownLine(): void {
    this.unsubscribeLine?.()
    this.unsubscribeLine = null
    // Any GET_STATUS/PING still in flight can no longer be answered.
    for (const resolve of this.pendingStatus.splice(0, this.pendingStatus.length)) resolve(null)
    this.pendingPong.splice(0, this.pendingPong.length)
  }

  private emitStatus(): void {
    // Built directly (not via the async getStatus()) so listeners are
    // notified synchronously — everything it needs is already in memory,
    // and callers reacting to a status change (e.g. the renderer push in
    // main/index.ts) shouldn't wait an extra microtask for no reason.
    const status: DeviceStatus = {
      connected: this.connected,
      deviceType: 'serial',
      protocolVersion: PROTOCOL_VERSION,
      controls: this.controls,
      displays: this.displays,
      modules: this.modules
    }
    for (const listener of this.statusListeners) listener(status)
  }

  private emitDeviceEvent(event: DeviceEvent): void {
    this.pushLog('fromDevice', deviceEventLogType(event), deviceEventDetail(event))
    for (const listener of this.deviceEventListeners) listener(event)
  }

  private pushLog(direction: DeviceLogEntry['direction'], type: string, detail?: string): void {
    const entry: DeviceLogEntry = { direction, type, detail, timestamp: Date.now() }
    this.log = [...this.log.slice(-(MAX_LOG_ENTRIES - 1)), entry]
    for (const listener of this.logListeners) listener(entry)
  }
}

function majorVersion(version: string): string {
  return version.split('.')[0]
}

function deviceEventLogType(event: DeviceEvent): string {
  switch (event.type) {
    case 'buttonPress':
      return 'BUTTON_PRESS'
    case 'encoderRotate':
      return 'ENCODER_ROTATE'
    case 'moduleConnected':
      return 'MODULE_CONNECTED'
    case 'moduleDisconnected':
      return 'MODULE_DISCONNECTED'
  }
}

function deviceEventDetail(event: DeviceEvent): string {
  switch (event.type) {
    case 'buttonPress':
      return `slot ${event.slot}`
    case 'encoderRotate':
      return `${event.moduleId} · delta ${event.delta}`
    case 'moduleConnected':
      return event.module.name
    case 'moduleDisconnected':
      return event.moduleId
  }
}
