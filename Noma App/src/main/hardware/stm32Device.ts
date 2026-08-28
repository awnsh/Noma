import { PROTOCOL_VERSION } from '@shared/constants'
import type { Control, DeviceEvent, DeviceStatus, LEDState } from '@shared/types'
import type { HardwareDevice } from './types'

/**
 * STM32HardwareDevice — a typed stub for the future physical prototype
 * (docs/architecture.md's "Hardware embedding considerations", Milestone
 * 3; product-audit.md's #1 hardware-readiness gap).
 *
 * This is not a working transport. There is no serial/USB code here on
 * purpose — brainstorm.md section 25 ("don't over-engineer") applies to a
 * transport that has no real device to talk to yet just as much as it does
 * to firmware. What this class *is* for: proving, by actually compiling
 * and type-checking against `HardwareDevice`, that the interface Phase 1
 * defined is sufficient for a second, non-virtual implementation — before
 * real hardware exists to discover the hard way that it wasn't. Every
 * method signature here is exercised by `VirtualHardwareDevice` today; this
 * class exists to prove nothing about that contract is virtual-device-only.
 *
 * It is never wired into the running app (main/index.ts still uses
 * `getDefaultHardwareDevice()`, i.e. the virtual device) — instantiating
 * this class has no user-visible effect. See docs/hardware-protocol.md for
 * the wire format a real transport will eventually implement against these
 * same method calls.
 *
 * "Do not fake a physical connection" (this phase's section 14): every
 * method here either reports the honest current state — not connected — or
 * rejects clearly. There is no code path that pretends a real device
 * answered when none exists.
 */
export class STM32HardwareDevice implements HardwareDevice {
  private connected = false
  private statusListeners = new Set<(status: DeviceStatus) => void>()

  async connect(): Promise<void> {
    // A real implementation would open the serial/USB connection here and
    // only resolve once the device actually answered a GET_STATUS. Failing
    // loudly (never silently reporting connected) is the deliberate
    // behavior until that transport exists — see the class doc comment.
    throw new Error(
      'No physical Noma device found. STM32HardwareDevice has no transport implemented yet — see src/main/hardware/stm32Device.ts.'
    )
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.emitStatus()
  }

  async setControls(_controls: Control[]): Promise<void> {
    // No transport to send over yet; a real implementation would encode
    // and write SET_CONTROLS here (docs/hardware-protocol.md).
  }

  async updateDisplay(_displayId: string, _content: string): Promise<void> {}

  async setLEDState(_ledId: string, _state: LEDState): Promise<void> {}

  async sendCommand(_command: string, _payload?: unknown): Promise<void> {}

  async getStatus(): Promise<DeviceStatus> {
    return {
      connected: this.connected,
      deviceType: 'stm32',
      protocolVersion: PROTOCOL_VERSION,
      controls: [],
      displays: {},
      modules: []
    }
  }

  onDeviceEvent(_callback: (event: DeviceEvent) => void): () => void {
    // Nothing ever fires — there is no transport reading real button
    // presses off a real device yet. Returning a valid no-op unsubscribe
    // (rather than throwing) keeps this a drop-in HardwareDevice, exactly
    // what this class exists to prove.
    return () => {}
  }

  onStatusChanged(callback: (status: DeviceStatus) => void): () => void {
    this.statusListeners.add(callback)
    return () => {
      this.statusListeners.delete(callback)
    }
  }

  private emitStatus(): void {
    void this.getStatus().then((status) => {
      for (const listener of this.statusListeners) listener(status)
    })
  }
}
