import { randomUUID } from 'crypto'
import { MODULE_CATALOG, PROTOCOL_VERSION } from '@shared/constants'
import type { Control, DeviceEvent, DeviceLogEntry, DeviceStatus, LEDState, Module } from '@shared/types'
import type { HardwareDevice } from './types'

const MAX_LOG_ENTRIES = 100

/**
 * VirtualHardwareDevice — the Phase 3 hardware simulator
 * (brainstorm.md section 8).
 *
 * This is the software-only stand-in for the physical keyboard. It holds
 * real state (connected, controls, displays, modules) and raises real
 * DEVICE → HOST events when the Virtual Keyboard page is interacted with,
 * so the rest of the app — and later, a real STM32HardwareDevice — is
 * exercised identically. Nothing here is hardcoded UI state; the renderer
 * only ever reflects what this class reports via getStatus()/onStatusChanged.
 *
 * Every HOST->DEVICE call and DEVICE->HOST event is also recorded to an
 * in-memory log (`getLog()`/`onLogEntry()`) for Developer Mode
 * (brainstorm.md section 20), using the same message names the future
 * STM32 wire protocol uses (docs/hardware-protocol.md) — this is meant to
 * be a rehearsal of that log, not a separate thing.
 */
export class VirtualHardwareDevice implements HardwareDevice {
  private connected = false
  private controls: Control[] = []
  private displays: Record<string, string> = {}
  private ledState: Record<string, LEDState> = {}
  private modules: Module[] = []
  private log: DeviceLogEntry[] = []

  private deviceEventListeners = new Set<(event: DeviceEvent) => void>()
  private statusListeners = new Set<(status: DeviceStatus) => void>()
  private logListeners = new Set<(entry: DeviceLogEntry) => void>()

  async connect(): Promise<void> {
    this.connected = true
    this.pushLog('toDevice', 'CONNECT')
    this.emitStatus()
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.pushLog('toDevice', 'DISCONNECT')
    this.emitStatus()
  }

  async setControls(controls: Control[]): Promise<void> {
    this.controls = controls
    this.pushLog('toDevice', 'SET_CONTROLS', `${controls.length} control(s)`)
    this.emitStatus()
  }

  async updateDisplay(displayId: string, content: string): Promise<void> {
    this.displays = { ...this.displays, [displayId]: content }
    this.pushLog('toDevice', 'SET_DISPLAY', `${displayId}: "${content}"`)
    this.emitStatus()
  }

  async setLEDState(ledId: string, state: LEDState): Promise<void> {
    this.ledState = { ...this.ledState, [ledId]: state }
    this.pushLog('toDevice', 'SET_LED', `${ledId}: ${state.on ? 'on' : 'off'}${state.color ? ` (${state.color})` : ''}`)
    this.emitStatus()
  }

  async sendCommand(command: string, _payload?: unknown): Promise<void> {
    // No commands are defined to send to the virtual device yet — this
    // exists so callers can depend on the full HardwareDevice interface
    // now. See docs/hardware-protocol.md (Phase 7) once real commands exist.
    this.pushLog('toDevice', 'COMMAND', command)
  }

  async getStatus(): Promise<DeviceStatus> {
    return {
      connected: this.connected,
      deviceType: 'virtual',
      protocolVersion: PROTOCOL_VERSION,
      controls: this.controls,
      displays: this.displays,
      modules: this.modules
    }
  }

  getLog(): DeviceLogEntry[] {
    return this.log
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

  /** Returns an unsubscribe function. */
  onLogEntry(callback: (entry: DeviceLogEntry) => void): () => void {
    this.logListeners.add(callback)
    return () => {
      this.logListeners.delete(callback)
    }
  }

  /**
   * Simulates a physical button press for the given control — called when
   * the user clicks a tile on the Virtual Keyboard page. This class itself
   * never sends real input; it only reports "button N was pressed", the
   * same DEVICE -> HOST fact a real STM32 device will eventually report
   * over serial. What that press *means* — and actually executing it — is
   * decided by a layer above (main/index.ts's device-event listener,
   * dispatching to actionExecutor.ts), which is deliberate: the hardware
   * layer shouldn't need to know what a "shortcut" or "macro" is, and a
   * real firmware device couldn't either.
   */
  pressControl(controlId: string): void {
    const control = this.controls.find((item) => item.id === controlId)
    if (!control) return
    this.emitDeviceEvent({ type: 'buttonPress', controlId, slot: control.slot })
  }

  /** Adds a module from the shared MODULE_CATALOG by type. Returns the created module. */
  addModuleByType(moduleType: string): Module {
    const catalogEntry =
      MODULE_CATALOG.find((entry) => entry.type === moduleType) ?? MODULE_CATALOG[0]

    const module: Module = {
      id: randomUUID(),
      name: catalogEntry.name,
      type: catalogEntry.type,
      capabilities: catalogEntry.capabilities,
      controlIds: [],
      position: this.modules.length
    }

    this.modules = [...this.modules, module]
    this.emitDeviceEvent({ type: 'moduleConnected', module })
    this.emitStatus()

    return module
  }

  removeModule(moduleId: string): void {
    const exists = this.modules.some((module) => module.id === moduleId)
    if (!exists) return

    this.modules = this.modules.filter((module) => module.id !== moduleId)
    this.emitDeviceEvent({ type: 'moduleDisconnected', moduleId })
    this.emitStatus()
  }

  private emitStatus(): void {
    void this.getStatus().then((status) => {
      for (const listener of this.statusListeners) listener(status)
    })
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

let defaultDevice: VirtualHardwareDevice | null = null

export function getDefaultHardwareDevice(): VirtualHardwareDevice {
  if (!defaultDevice) {
    defaultDevice = new VirtualHardwareDevice()
  }
  return defaultDevice
}
