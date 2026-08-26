import { beforeEach, describe, expect, it } from 'vitest'
import { VirtualHardwareDevice } from './virtualDevice'
import type { Control, DeviceEvent, DeviceStatus } from '@shared/types'

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
})
