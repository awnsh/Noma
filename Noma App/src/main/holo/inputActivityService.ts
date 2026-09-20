import { uIOhook } from 'uiohook-napi'
import { acquireHook, releaseHook } from '../workflow/sharedHook'

/** Key auto-repeat can fire dozens of events a second; one timestamp per
 *  this window is all the gate needs. */
const MIN_EMIT_GAP_MS = 15

/**
 * Tells Holo *when* the user physically pressed a key / clicked / scrolled —
 * timestamps only, never which key or where — so Holo can discard the sound
 * of typing and clicking instead of guessing from audio alone. The OS hook
 * exists only between start() and stop(), i.e. only while Holo is listening
 * or calibrating (see docs/privacy-and-legal.md).
 */
export class InputActivityService {
  private isRunning = false
  private lastEmit = 0

  constructor(private readonly onActivity: (timestamp: number) => void) {}

  start(): void {
    if (this.isRunning) return
    uIOhook.on('keydown', this.handle)
    uIOhook.on('keyup', this.handle)
    uIOhook.on('mousedown', this.handle)
    uIOhook.on('mouseup', this.handle)
    uIOhook.on('wheel', this.handle)
    acquireHook()
    this.isRunning = true
  }

  stop(): void {
    if (!this.isRunning) return
    uIOhook.off('keydown', this.handle)
    uIOhook.off('keyup', this.handle)
    uIOhook.off('mousedown', this.handle)
    uIOhook.off('mouseup', this.handle)
    uIOhook.off('wheel', this.handle)
    releaseHook()
    this.isRunning = false
  }

  private readonly handle = (): void => {
    const now = Date.now()
    if (now - this.lastEmit < MIN_EMIT_GAP_MS) return
    this.lastEmit = now
    this.onActivity(now)
  }
}
