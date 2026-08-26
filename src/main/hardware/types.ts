import type { Control, DeviceEvent, DeviceStatus, LEDState } from '@shared/types'

/**
 * Hardware abstraction layer (brainstorm.md section 9).
 *
 * Nothing in the rest of the app should ever import VirtualHardwareDevice
 * or a future USB/SerialHardwareDevice directly — only this interface.
 * That is what makes swapping the virtual device for real STM32 hardware
 * later an implementation swap, not an architecture rewrite (Milestone 3).
 *
 * onDeviceEvent/onStatusChanged model the DEVICE → HOST direction
 * (brainstorm.md section 21): a real device reports button presses,
 * encoder turns, and module changes asynchronously, not just in response
 * to a host command. The virtual device raises the same shape from UI
 * clicks so the rest of the app is exercised the same way it will be
 * against real hardware.
 */
export interface HardwareDevice {
  connect(): Promise<void>
  disconnect(): Promise<void>
  setControls(controls: Control[]): Promise<void>
  updateDisplay(displayId: string, content: string): Promise<void>
  setLEDState(ledId: string, state: LEDState): Promise<void>
  sendCommand(command: string, payload?: unknown): Promise<void>
  getStatus(): Promise<DeviceStatus>
  /** Returns an unsubscribe function. */
  onDeviceEvent(callback: (event: DeviceEvent) => void): () => void
  /** Returns an unsubscribe function. */
  onStatusChanged(callback: (status: DeviceStatus) => void): () => void
}
