import { WebSocket, WebSocketServer } from 'ws'
import { DEVICE_TRANSPORT_PORT } from '@shared/constants'
import type { ActionExecutionEvent } from '@shared/types'
import type { VirtualHardwareDevice } from './virtualDevice'

/**
 * The real transport for docs/hardware-protocol.md's HOST<->DEVICE
 * messages — a loopback-only WebSocket server, so an external process
 * (the standalone `Noma Virtual Device` app, a real OLED+4-button module
 * rendered as its own native window) can drive the exact same
 * VirtualHardwareDevice the in-app Virtual Keyboard page already uses.
 *
 * This is deliberately NOT the future USB/serial firmware transport that
 * doc describes for real STM32 hardware (still not built) — it's a
 * software-only stand-in for testing pre-hardware, speaking the identical
 * message vocabulary so nothing here needs to change when a real
 * transport eventually replaces it.
 *
 * Bound to 127.0.0.1 only, never 0.0.0.0 — a connected client can trigger
 * real keystrokes via BUTTON_PRESS, so this must never be reachable from
 * outside this machine. See docs/security-review.md.
 *
 * Owns the plugged-in/unplugged lifecycle: the underlying
 * VirtualHardwareDevice only reports `connected: true` while at least one
 * external client (the virtual device app) is actually attached — see
 * main/index.ts, which no longer calls hardwareDevice.connect() itself.
 */
export class DeviceTransportServer {
  private server: WebSocketServer | null = null
  private clients = new Set<WebSocket>()
  private unsubscribeStatus: (() => void) | null = null
  private listening: Promise<void> = Promise.resolve()

  constructor(private readonly device: VirtualHardwareDevice) {}

  /** `port` defaults to the shared constant; tests pass 0 for an
   *  OS-assigned ephemeral port instead of colliding on the real one.
   *  Returns a promise that resolves once the port is actually bound —
   *  `main/index.ts` doesn't need to await it, but tests do (`.address`
   *  isn't valid until then). */
  start(port: number = DEVICE_TRANSPORT_PORT): Promise<void> {
    if (this.server) return this.listening

    this.server = new WebSocketServer({ host: '127.0.0.1', port })
    this.listening = new Promise((resolve) => this.server?.once('listening', () => resolve()))

    this.unsubscribeStatus = this.device.onStatusChanged((status) => {
      this.broadcast({ type: 'DEVICE_STATUS', payload: status })
    })

    this.server.on('connection', (socket) => {
      this.clients.add(socket)
      if (this.clients.size === 1) {
        // First real client attached — the keyboard just got plugged in.
        void this.device.connect()
      } else {
        // A later client (e.g. a second window) just wants the current
        // state, not a redundant CONNECT log entry.
        void this.device.getStatus().then((status) => {
          this.send(socket, { type: 'DEVICE_STATUS', payload: status })
        })
      }

      socket.on('message', (raw) => this.handleMessage(socket, raw.toString()))

      socket.on('close', () => {
        this.clients.delete(socket)
        if (this.clients.size === 0) {
          // Last client gone — the keyboard just got unplugged.
          void this.device.disconnect()
        }
      })

      // Swallow socket-level errors so one misbehaving client can't crash
      // the host process — 'close' still fires afterward, cleaning it up.
      socket.on('error', () => {})
    })

    return this.listening
  }

  stop(): void {
    this.unsubscribeStatus?.()
    this.unsubscribeStatus = null
    for (const client of this.clients) client.terminate()
    this.clients.clear()
    this.server?.close()
    this.server = null
  }

  /**
   * Tells attached clients whether a press they just sent actually did
   * anything — the same `ActionExecutionEvent` Noma App's own in-app
   * Virtual Keyboard page already shows (`ACTION_EXECUTED` over IPC,
   * `main/index.ts`). Without this, a refused press (e.g. a control
   * mapped to Ctrl+Q — permanently blocked, see actionExecutor.ts's
   * BLOCKED_COMBOS, since it can quit an application) looks identical to a
   * button that silently does nothing, from the standalone device's point
   * of view. Not part of docs/hardware-protocol.md's device-event table —
   * a real physical button can't know whether its press "worked" any more
   * than this software one inherently can; this is host-side knowledge
   * relayed back down purely for this transport's own on-screen feedback.
   */
  notifyActionExecuted(event: ActionExecutionEvent): void {
    this.broadcast({ type: 'ACTION_EXECUTED', payload: event })
  }

  /** The actual bound port — differs from the requested one when `start(0)`
   *  asked for an OS-assigned port (used by tests). */
  get address(): { port: number } | null {
    const addr = this.server?.address()
    if (!addr || typeof addr === 'string') return null
    return { port: addr.port }
  }

  private handleMessage(socket: WebSocket, raw: string): void {
    let message: unknown
    try {
      message = JSON.parse(raw)
    } catch {
      return // malformed input from a client is ignored, not fatal
    }
    if (typeof message !== 'object' || message === null || !('type' in message)) return

    const { type } = message as { type: unknown }

    switch (type) {
      case 'BUTTON_PRESS': {
        const payload = (message as { payload?: { controlId?: unknown } }).payload
        if (payload && typeof payload.controlId === 'string') {
          this.device.pressControl(payload.controlId)
        }
        return
      }
      case 'GET_STATUS':
        void this.device.getStatus().then((status) => {
          this.send(socket, { type: 'DEVICE_STATUS', payload: status })
        })
        return
      case 'PING':
        this.send(socket, { type: 'PONG' })
        return
      default:
        return
    }
  }

  private send(socket: WebSocket, message: unknown): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }

  private broadcast(message: unknown): void {
    for (const client of this.clients) this.send(client, message)
  }
}
