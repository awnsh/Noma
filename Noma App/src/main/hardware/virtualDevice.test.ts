import { beforeEach, describe, expect, it } from 'vitest'
import { VirtualHardwareDevice } from './virtualDevice'
import type { Control, DeviceEvent, DeviceLogEntry, DeviceStatus } from '@shared/types'

const CONTROLS: Control[] = [
  { id: 'ctrl-run', slot: 1, label: 'RUN', action: { type: 'shortcut', keys: ['Control', 'F5'] } },
  { id: 'ctrl-debug', slot: 2, label: 'DEBUG', action: { type: 'shortcut', keys: ['F5'] } }
]

describe('VirtualHardwareDevice', () => {
  let device: VirtualHardwareDevice

  beforeEach(() => {
    device = new VirtualHardwareDevice()
  })

  it('starts disconnected with no controls or modules', async () => {
    const status = await device.getStatus()
    expect(status.connected).toBe(false)
    expect(status.controls).toEqual([])
    expect(status.modules).toEqual([])
  })

  it('reports connected after connect() and disconnected after disconnect()', async () => {
    await device.connect()
    expect((await device.getStatus()).connected).toBe(true)

    await device.disconnect()
    expect((await device.getStatus()).connected).toBe(false)
  })

  it('setControls updates status and notifies status listeners', async () => {
    const statuses: DeviceStatus[] = []
    device.onStatusChanged((status) => statuses.push(status))

    await device.setControls(CONTROLS)

    expect((await device.getStatus()).controls).toEqual(CONTROLS)
    expect(statuses).toHaveLength(1)
    expect(statuses[0].controls).toEqual(CONTROLS)
  })

  it('updateDisplay stores content by display id', async () => {
    await device.updateDisplay('status', 'Visual Studio Code')
    expect((await device.getStatus()).displays).toEqual({ status: 'Visual Studio Code' })
  })

  it('pressControl emits a buttonPress event for a known control', async () => {
    await device.setControls(CONTROLS)
    const events: DeviceEvent[] = []
    device.onDeviceEvent((event) => events.push(event))

    device.pressControl('ctrl-debug')

    expect(events).toEqual([{ type: 'buttonPress', controlId: 'ctrl-debug', slot: 2 }])
  })

  it('pressControl is a no-op for an unknown control id', async () => {
    await device.setControls(CONTROLS)
    const events: DeviceEvent[] = []
    device.onDeviceEvent((event) => events.push(event))

    device.pressControl('does-not-exist')

    expect(events).toHaveLength(0)
  })

  it('addModuleByType adds a module from the catalog and emits moduleConnected', async () => {
    const events: DeviceEvent[] = []
    device.onDeviceEvent((event) => events.push(event))

    const module = device.addModuleByType('encoder')

    expect(module.type).toBe('encoder')
    expect(module.name).toBe('Rotary Encoder Module')
    expect((await device.getStatus()).modules).toEqual([module])
    expect(events).toEqual([{ type: 'moduleConnected', module }])
  })

  it('removeModule removes the module and emits moduleDisconnected', async () => {
    const module = device.addModuleByType('macro')
    const events: DeviceEvent[] = []
    device.onDeviceEvent((event) => events.push(event))

    device.removeModule(module.id)

    expect((await device.getStatus()).modules).toEqual([])
    expect(events).toEqual([{ type: 'moduleDisconnected', moduleId: module.id }])
  })

  it('removeModule is a no-op for an unknown module id', async () => {
    device.addModuleByType('macro')
    const events: DeviceEvent[] = []
    device.onDeviceEvent((event) => events.push(event))

    device.removeModule('does-not-exist')

    expect(events).toHaveLength(0)
    expect((await device.getStatus()).modules).toHaveLength(1)
  })

  it('unsubscribing a status listener stops further notifications', async () => {
    const statuses: DeviceStatus[] = []
    const unsubscribe = device.onStatusChanged((status) => statuses.push(status))

    await device.setControls(CONTROLS)
    unsubscribe()
    await device.updateDisplay('status', 'Chrome')

    expect(statuses).toHaveLength(1)
  })

  describe('device log (Developer Mode / hardware-protocol.md)', () => {
    it('logs a toDevice entry for each HOST -> DEVICE call, using the protocol message names', async () => {
      await device.connect()
      await device.setControls(CONTROLS)
      await device.updateDisplay('status', 'VS Code')
      await device.setLEDState('led-1', { on: true })

      const log = device.getLog()
      expect(log.map((entry) => entry.type)).toEqual([
        'CONNECT',
        'SET_CONTROLS',
        'SET_DISPLAY',
        'SET_LED'
      ])
      expect(log.every((entry) => entry.direction === 'toDevice')).toBe(true)
      expect(log.find((entry) => entry.type === 'SET_DISPLAY')?.detail).toContain('VS Code')
    })

    it('logs a fromDevice entry for each DEVICE -> HOST event', async () => {
      await device.setControls(CONTROLS)
      device.pressControl('ctrl-run')
      device.addModuleByType('encoder')

      const log = device.getLog()
      const buttonPress = log.find((entry) => entry.type === 'BUTTON_PRESS')
      const moduleConnected = log.find((entry) => entry.type === 'MODULE_CONNECTED')

      expect(buttonPress?.direction).toBe('fromDevice')
      expect(buttonPress?.detail).toContain('slot 1')
      expect(moduleConnected?.direction).toBe('fromDevice')
      expect(moduleConnected?.detail).toContain('Rotary Encoder Module')
    })

    it('notifies log listeners live and supports unsubscribing', async () => {
      const entries: DeviceLogEntry[] = []
      const unsubscribe = device.onLogEntry((entry) => entries.push(entry))

      await device.connect()
      unsubscribe()
      await device.disconnect()

      expect(entries).toHaveLength(1)
      expect(entries[0].type).toBe('CONNECT')
    })

    it('caps the log so it cannot grow unbounded', async () => {
      await device.setControls(CONTROLS)
      for (let i = 0; i < 150; i++) {
        await device.updateDisplay('status', `tick ${i}`)
      }
      expect(device.getLog().length).toBeLessThanOrEqual(100)
    })

    it('clearLog empties the log', async () => {
      await device.connect()
      expect(device.getLog().length).toBeGreaterThan(0)
      device.clearLog()
      expect(device.getLog()).toEqual([])
    })
  })

  describe('configureModule (Module configuration, brainstorm.md section 10)', () => {
    it('stores configuration on the module and notifies status listeners', async () => {
      // Subscribed before both calls, so both emitStatus notifications
      // (module add, then configure) are reliably captured despite
      // emitStatus resolving via a microtask.
      const statuses: DeviceStatus[] = []
      device.onStatusChanged((status) => statuses.push(status))

      const module = device.addModuleByType('encoder')
      const configuration = {
        rotateCW: { type: 'shortcut', keys: ['Control', 'Equal'] },
        press: { type: 'shortcut', keys: ['Space'] }
      }
      const updated = device.configureModule(module.id, configuration)

      expect(updated?.configuration).toEqual(configuration)
      expect((await device.getStatus()).modules[0].configuration).toEqual(configuration)
      expect(statuses).toHaveLength(2)
      expect(statuses[1].modules[0].configuration).toEqual(configuration)
    })

    it('returns null for an unknown module id', () => {
      expect(device.configureModule('does-not-exist', {})).toBeNull()
    })
  })

  describe('rotateEncoder', () => {
    it('emits an encoderRotate event for a rotate-capable module', () => {
      const module = device.addModuleByType('encoder')
      const events: DeviceEvent[] = []
      device.onDeviceEvent((event) => events.push(event))

      device.rotateEncoder(module.id, 1)

      expect(events).toEqual([{ type: 'encoderRotate', moduleId: module.id, delta: 1 }])
    })

    it('is a no-op for a module without rotate capability', () => {
      const module = device.addModuleByType('display')
      const events: DeviceEvent[] = []
      device.onDeviceEvent((event) => events.push(event))

      device.rotateEncoder(module.id, 1)

      expect(events).toHaveLength(0)
    })

    it('is a no-op for an unknown module id', () => {
      const events: DeviceEvent[] = []
      device.onDeviceEvent((event) => events.push(event))
      device.rotateEncoder('does-not-exist', 1)
      expect(events).toHaveLength(0)
    })
  })

  describe('ping', () => {
    it('returns ok:false while disconnected and logs PING/PONG', async () => {
      const result = await device.ping()
      expect(result.ok).toBe(false)
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
      expect(device.getLog().map((entry) => entry.type)).toEqual(['PING', 'PONG'])
    })

    it('returns ok:true once connected', async () => {
      await device.connect()
      const result = await device.ping()
      expect(result.ok).toBe(true)
    })
  })

  describe('reset', () => {
    it('cycles through disconnect then connect, ending connected', async () => {
      await device.connect()
      device.clearLog()

      await device.reset()

      expect((await device.getStatus()).connected).toBe(true)
      expect(device.getLog().map((entry) => entry.type)).toEqual(['DISCONNECT', 'CONNECT'])
    })
  })
})
