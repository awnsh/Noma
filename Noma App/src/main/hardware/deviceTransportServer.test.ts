import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { DeviceTransportServer } from './deviceTransportServer'
import { VirtualHardwareDevice } from './virtualDevice'
import type { Control, DeviceEvent, DeviceStatus } from '@shared/types'

const CONTROLS: Control[] = [
  { id: 'ctrl-run', slot: 1, label: 'RUN', action: { type: 'shortcut', keys: ['Control', 'F5'] } }
]

type WireMessage = { type: string; payload?: unknown }

/**
 * Queues every message from the moment the socket is created, not from
 * whenever a test happens to call `next()` — the server can (and does, by
 * design) send the initial DEVICE_STATUS the instant the connection opens,
 * which can otherwise race a `once('message', ...)` attached only after
 * `await`ing the 'open' event.
 */
class MessageQueue {
  private pending: WireMessage[] = []
  private waiters: Array<(message: WireMessage) => void> = []

  constructor(socket: WebSocket) {
    socket.on('message', (raw) => {
      const parsed = JSON.parse(raw.toString()) as WireMessage
      const waiter = this.waiters.shift()
      if (waiter) waiter(parsed)
      else this.pending.push(parsed)
    })
  }

  next(): Promise<WireMessage> {
    const queued = this.pending.shift()
    if (queued) return Promise.resolve(queued)
    return new Promise((resolve) => this.waiters.push(resolve))
  }
}

function waitForOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve) => socket.once('open', () => resolve()))
}

describe('DeviceTransportServer', () => {
  let device: VirtualHardwareDevice
  let transport: DeviceTransportServer
  let sockets: WebSocket[]

  beforeEach(async () => {
    device = new VirtualHardwareDevice()
    await device.setControls(CONTROLS)
    transport = new DeviceTransportServer(device)
    await transport.start(0) // OS-assigned port — never the real shared one
    sockets = []
  })

  afterEach(() => {
    for (const socket of sockets) socket.terminate()
    transport.stop()
  })

  async function connectClient(): Promise<{ socket: WebSocket; queue: MessageQueue }> {
    const port = transport.address?.port
    if (!port) throw new Error('server did not report a bound port')
    const socket = new WebSocket(`ws://127.0.0.1:${port}`)
    sockets.push(socket)
    const queue = new MessageQueue(socket) // attached before 'open' — see MessageQueue's doc comment
    await waitForOpen(socket)
    return { socket, queue }
  }

  it('sends the current DEVICE_STATUS as soon as a client connects', async () => {
    const { queue } = await connectClient()
    const message = await queue.next()

    expect(message.type).toBe('DEVICE_STATUS')
    expect((message.payload as DeviceStatus).controls).toEqual(CONTROLS)
  })

  it('connects the underlying device when the first client attaches, and disconnects it when the last one detaches', async () => {
    expect((await device.getStatus()).connected).toBe(false)

    const { socket, queue } = await connectClient()
    await queue.next() // the initial DEVICE_STATUS above

    expect((await device.getStatus()).connected).toBe(true)

    socket.close()
    await new Promise((resolve) => socket.once('close', resolve))
    // give the server's own 'close' handler a tick to run
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect((await device.getStatus()).connected).toBe(false)
  })

  it('a BUTTON_PRESS message presses the real control, same as the in-app PRESS_CONTROL IPC handler', async () => {
    const { socket, queue } = await connectClient()
    await queue.next() // initial DEVICE_STATUS

    const events: DeviceEvent[] = []
    device.onDeviceEvent((event) => events.push(event))

    socket.send(JSON.stringify({ type: 'BUTTON_PRESS', payload: { controlId: 'ctrl-run' } }))
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(events).toEqual([{ type: 'buttonPress', controlId: 'ctrl-run', slot: 1 }])
  })

  it('notifyActionExecuted broadcasts ACTION_EXECUTED to attached clients, refusal reason included', async () => {
    const { queue } = await connectClient()
    await queue.next() // initial DEVICE_STATUS

    transport.notifyActionExecuted({
      controlId: 'ctrl-run',
      ok: false,
      reason: 'Refused: Control+Q can close a window or quit an application — window-closing shortcuts are never auto-executed'
    })

    const message = await queue.next()
    expect(message).toEqual({
      type: 'ACTION_EXECUTED',
      payload: {
        controlId: 'ctrl-run',
        ok: false,
        reason: 'Refused: Control+Q can close a window or quit an application — window-closing shortcuts are never auto-executed'
      }
    })
  })

  it('replies to GET_STATUS and PING', async () => {
    const { socket, queue } = await connectClient()
    await queue.next() // initial DEVICE_STATUS

    socket.send(JSON.stringify({ type: 'PING' }))
    expect((await queue.next()).type).toBe('PONG')

    socket.send(JSON.stringify({ type: 'GET_STATUS' }))
    expect((await queue.next()).type).toBe('DEVICE_STATUS')
  })

  it('ignores malformed messages instead of crashing', async () => {
    const { socket, queue } = await connectClient()
    await queue.next() // initial DEVICE_STATUS

    expect(() => socket.send('not json')).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(socket.readyState).toBe(WebSocket.OPEN)
  })

  it('broadcasts DEVICE_STATUS to all connected clients on a status change', async () => {
    const clientA = await connectClient()
    await clientA.queue.next()
    const clientB = await connectClient()
    await clientB.queue.next() // clientB's own initial status (size > 1 branch)

    const nextA = clientA.queue.next()
    const nextB = clientB.queue.next()
    await device.updateDisplay('status', 'Visual Studio Code')

    expect(((await nextA).payload as DeviceStatus).displays.status).toBe('Visual Studio Code')
    expect(((await nextB).payload as DeviceStatus).displays.status).toBe('Visual Studio Code')
  })
})
