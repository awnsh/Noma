import { beforeEach, describe, expect, it } from 'vitest'
import { PROTOCOL_VERSION } from '@shared/constants'
import { SerialHardwareDevice, type LineTransport } from './serialDevice'
import type { Control, DeviceEvent, DeviceStatus } from '@shared/types'

const CONTROLS: Control[] = [
  { id: 'ctrl-run', slot: 1, label: 'RUN', action: { type: 'shortcut', keys: ['Control', 'F5'] } },
  { id: 'ctrl-debug', slot: 2, label: 'DEBUG', action: { type: 'shortcut', keys: ['F5'] } }
]

/** An in-memory stand-in for a real serial port — captures every written
 *  line and lets a test simulate the device's side of the conversation by
 *  feeding lines back in, without a real port or the `serialport` package.
 *  See serialTransport.ts's doc comment for why that split exists. */
class FakeLineTransport implements LineTransport {
  written: string[] = []
  closed = false
  private listeners = new Set<(line: string) => void>()

  write(line: string): void {
    this.written.push(line)
  }

  onLine(callback: (line: string) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  close(): void {
    this.closed = true
  }

  /** Test helper: simulates a raw line arriving from the device — used
   *  directly (rather than through `emit`) to exercise malformed input. */
  emitLine(raw: string): void {
    for (const listener of this.listeners) listener(raw)
  }

  /** Test helper: simulates the device sending a well-formed message. */
  emit(message: unknown): void {
    this.emitLine(JSON.stringify(message))
  }

  /** Test helper: the most recently written message, parsed. */
  lastSent(): { type: string; payload?: unknown } {
    return JSON.parse(this.written[this.written.length - 1])
  }
}

function deviceStatus(overrides: Partial<DeviceStatus> = {}): DeviceStatus {
  return {
    connected: true,
    deviceType: 'serial',
    protocolVersion: PROTOCOL_VERSION,
    controls: CONTROLS,
    displays: {},
    modules: [],
    ...overrides
  }
}

describe('SerialHardwareDevice', () => {
  let transport: FakeLineTransport
  let device: SerialHardwareDevice

  beforeEach(() => {
    transport = new FakeLineTransport()
    // Short timeouts so the "nothing answers" tests don't slow the suite.
    device = new SerialHardwareDevice(transport, { statusTimeoutMs: 50, pingTimeoutMs: 50 })
  })

  describe('connect', () => {
    it('sends GET_STATUS and connects once the device answers with a compatible protocol version', async () => {
      const connectPromise = device.connect()
      expect(transport.lastSent()).toEqual({ type: 'GET_STATUS' })

      transport.emit({ type: 'DEVICE_STATUS', payload: deviceStatus() })
      await connectPromise

      const status = await device.getStatus()
      expect(status.connected).toBe(true)
      expect(status.controls).toEqual(CONTROLS)
    })

    it('rejects if no device answers before the timeout', async () => {
      await expect(device.connect()).rejects.toThrow(/no Noma device answered/)
      expect((await device.getStatus()).connected).toBe(false)
    })

    it('refuses to connect on a major protocol version mismatch', async () => {
      const connectPromise = device.connect()
      transport.emit({ type: 'DEVICE_STATUS', payload: deviceStatus({ protocolVersion: '9.0.0' }) })

      await expect(connectPromise).rejects.toThrow(/protocol/i)
      expect((await device.getStatus()).connected).toBe(false)
    })

    it('is a no-op if already connected', async () => {
      const first = device.connect()
      transport.emit({ type: 'DEVICE_STATUS', payload: deviceStatus() })
      await first

      const writesBefore = transport.written.length
      await device.connect()
      expect(transport.written.length).toBe(writesBefore) // no second GET_STATUS sent
    })
  })

  describe('once connected', () => {
    beforeEach(async () => {
      const connectPromise = device.connect()
      transport.emit({ type: 'DEVICE_STATUS', payload: deviceStatus() })
      await connectPromise
      transport.written = [] // clear handshake traffic for cleaner assertions below
    })

    it('setControls writes SET_CONTROLS and updates local status', async () => {
      const statuses: DeviceStatus[] = []
      device.onStatusChanged((status) => statuses.push(status))

      await device.setControls(CONTROLS)

      expect(transport.lastSent()).toEqual({ type: 'SET_CONTROLS', payload: CONTROLS })
      expect((await device.getStatus()).controls).toEqual(CONTROLS)
      expect(statuses).toHaveLength(1)
    })

    it('updateDisplay writes SET_DISPLAY and updates local status', async () => {
      await device.updateDisplay('status', 'Visual Studio Code')

      expect(transport.lastSent()).toEqual({
        type: 'SET_DISPLAY',
        payload: { displayId: 'status', content: 'Visual Studio Code' }
      })
      expect((await device.getStatus()).displays).toEqual({ status: 'Visual Studio Code' })
    })

    it('setLEDState writes SET_LED', async () => {
      await device.setLEDState('led-1', { on: true, color: '#4c7eff' })

      expect(transport.lastSent()).toEqual({
        type: 'SET_LED',
        payload: { ledId: 'led-1', state: { on: true, color: '#4c7eff' } }
      })
    })

    it('a real BUTTON_PRESS line from the device raises a buttonPress DeviceEvent', () => {
      const events: DeviceEvent[] = []
      device.onDeviceEvent((event) => events.push(event))

      transport.emit({ type: 'BUTTON_PRESS', payload: { controlId: 'ctrl-run', slot: 1 } })

      expect(events).toEqual([{ type: 'buttonPress', controlId: 'ctrl-run', slot: 1 }])
    })

    it('a real ENCODER_ROTATE line raises an encoderRotate DeviceEvent', () => {
      const events: DeviceEvent[] = []
      device.onDeviceEvent((event) => events.push(event))

      transport.emit({ type: 'ENCODER_ROTATE', payload: { moduleId: 'encoder-1', delta: -1 } })

      expect(events).toEqual([{ type: 'encoderRotate', moduleId: 'encoder-1', delta: -1 }])
    })

    it('ignores a malformed or non-JSON line instead of throwing', () => {
      const events: DeviceEvent[] = []
      device.onDeviceEvent((event) => events.push(event))

      expect(() => transport.emitLine('{not valid json')).not.toThrow()
      expect(() => transport.emitLine('"just a string"')).not.toThrow()
      expect(() => transport.emitLine('')).not.toThrow()

      expect(events).toHaveLength(0)
    })

    it('ignores an unknown message type instead of throwing', () => {
      expect(() => transport.emit({ type: 'SOMETHING_FUTURE', payload: {} })).not.toThrow()
    })

    it('an unsolicited DEVICE_STATUS push updates the local mirror and notifies listeners', async () => {
      const statuses: DeviceStatus[] = []
      device.onStatusChanged((status) => statuses.push(status))

      transport.emit({ type: 'DEVICE_STATUS', payload: deviceStatus({ displays: { status: 'Chrome' } }) })

      expect(statuses).toHaveLength(1)
      expect((await device.getStatus()).displays).toEqual({ status: 'Chrome' })
    })

    it('ping resolves ok:true once the device answers PONG', async () => {
      const pingPromise = device.ping()
      expect(transport.lastSent()).toEqual({ type: 'PING' })

      transport.emit({ type: 'PONG' })

      const result = await pingPromise
      expect(result.ok).toBe(true)
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('ping resolves ok:false if nothing answers before the timeout', async () => {
      const result = await device.ping()
      expect(result.ok).toBe(false)
    })

    it('disconnect tears down the line and reports disconnected', async () => {
      await device.disconnect()

      expect((await device.getStatus()).connected).toBe(false)
      expect(transport.written.some((line) => JSON.parse(line).type === 'DISCONNECT')).toBe(false) // DISCONNECT is a log label, not a wire message
    })

    it('reset disconnects then re-runs the connect handshake', async () => {
      const resetPromise = device.reset()
      // reset() awaits disconnect() first, which needs one microtask tick
      // to resolve before connect() actually resubscribes and sends its
      // own fresh GET_STATUS — emitting before that would answer no one.
      await Promise.resolve()
      transport.emit({ type: 'DEVICE_STATUS', payload: deviceStatus() })
      await resetPromise

      expect((await device.getStatus()).connected).toBe(true)
    })

    it('a GET_STATUS/PING in flight when disconnect() runs resolves rather than hangs', async () => {
      await device.disconnect()
      const pingResult = await device.ping()
      expect(pingResult.ok).toBe(false)
    })
  })

  describe('ping while never connected', () => {
    it('resolves ok:false immediately without writing anything', async () => {
      const result = await device.ping()
      expect(result.ok).toBe(false)
      expect(transport.written).toHaveLength(0)
    })
  })

  describe('device log (Developer Mode / hardware-protocol.md)', () => {
    it('logs the handshake using the protocol message names', async () => {
      const connectPromise = device.connect()
      transport.emit({ type: 'DEVICE_STATUS', payload: deviceStatus() })
      await connectPromise

      const log = device.getLog()
      expect(log.map((entry) => entry.type)).toEqual(['GET_STATUS', 'DEVICE_STATUS', 'CONNECT'])
    })

    it('notifies log listeners live and supports clearLog', async () => {
      const entries = [] as ReturnType<typeof device.getLog>
      device.onLogEntry((entry) => entries.push(entry))

      const connectPromise = device.connect()
      transport.emit({ type: 'DEVICE_STATUS', payload: deviceStatus() })
      await connectPromise

      expect(entries.length).toBeGreaterThan(0)

      device.clearLog()
      expect(device.getLog()).toEqual([])
    })
  })
})
