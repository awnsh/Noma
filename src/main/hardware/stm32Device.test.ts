import { describe, expect, it } from 'vitest'
import { STM32HardwareDevice } from './stm32Device'
import type { HardwareDevice } from './types'

describe('STM32HardwareDevice', () => {
  it('satisfies the HardwareDevice interface (compile-time proof)', () => {
    const device: HardwareDevice = new STM32HardwareDevice()
    expect(device).toBeDefined()
  })

  it('reports not connected and deviceType stm32, never a faked connection', async () => {
    const device = new STM32HardwareDevice()
    const status = await device.getStatus()
    expect(status.connected).toBe(false)
    expect(status.deviceType).toBe('stm32')
    expect(status.controls).toEqual([])
    expect(status.modules).toEqual([])
  })

  it('connect() rejects clearly instead of pretending to succeed', async () => {
    const device = new STM32HardwareDevice()
    await expect(device.connect()).rejects.toThrow(/no physical/i)
  })

  it('disconnect() is safe to call and keeps status not-connected', async () => {
    const device = new STM32HardwareDevice()
    await device.disconnect()
    expect((await device.getStatus()).connected).toBe(false)
  })

  it('onDeviceEvent never fires (no transport) but returns a valid unsubscribe', () => {
    const device = new STM32HardwareDevice()
    const events: unknown[] = []
    const unsubscribe = device.onDeviceEvent((event) => events.push(event))
    unsubscribe()
    expect(events).toHaveLength(0)
  })

  it('onStatusChanged notifies subscribers on disconnect() and supports unsubscribing', async () => {
    const device = new STM32HardwareDevice()
    const statuses: boolean[] = []
    const unsubscribe = device.onStatusChanged((status) => statuses.push(status.connected))

    await device.disconnect()
    unsubscribe()
    await device.disconnect()

    expect(statuses).toEqual([false])
  })

  it('setControls/updateDisplay/setLEDState/sendCommand are safe no-ops with no transport', async () => {
    const device = new STM32HardwareDevice()
    await expect(device.setControls([])).resolves.toBeUndefined()
    await expect(device.updateDisplay('status', 'x')).resolves.toBeUndefined()
    await expect(device.setLEDState('led-1', { on: true })).resolves.toBeUndefined()
    await expect(device.sendCommand('ping')).resolves.toBeUndefined()
  })
})
