import type { BrowserWindow } from 'electron'
import { existsSync, rmSync, writeFileSync } from 'fs'
import type {
  ApplicationContext,
  Control,
  GlideActivity,
  GlideState,
  HoloTouchCheckSummary,
  HoloTrackpadEvent,
  HoloTrackpadStatus,
  HoloTrackpadZoneCount
} from '@shared/types'
import {
  getGlideEnabled,
  getGlideZoneCount,
  setGlideEnabled,
  setGlideZoneCount
} from '../database/repositories/settingsRepository'
import { getMacroById } from '../database/repositories/macrosRepository'
import { isMac, isWindows } from '../platform'
import { TrackpadGestureService } from './trackpadGestureService'
import { resolveGlidePress } from './glidePress'
import type { CheckPhase } from './touchTrace'

const UNSUPPORTED_MESSAGE = 'Glide needs a Windows laptop or a Mac with a trackpad. It isn’t available on this computer.'
const NO_TOUCHPAD_MESSAGE = isMac
  ? 'No trackpad found. Glide needs a MacBook’s built-in trackpad or a Magic Trackpad; a mouse can’t report where a finger is.'
  : 'No precision touchpad found. Glide reads raw finger positions, which only Windows precision touchpads report. Check Settings > Bluetooth & devices > Touchpad: if it doesn’t say “Your PC has a precision touchpad”, Glide can’t work on this laptop.'
const NO_WINDOW_MESSAGE = 'Glide couldn’t start because Noma’s window isn’t ready. Try again in a moment.'
const CRASHED_MESSAGE =
  'Glide was switched off because Noma closed unexpectedly while it was running. Turn it back on to try again, and if it happens again, please send us a bug report.'

/** What the controller needs from the rest of main. */
export interface GlideHost {
  getWindow: () => BrowserWindow | null
  getContext: () => ApplicationContext
  /** Noma's own window is the one in front. */
  isNomaFocused: () => boolean
  isActionRunning: () => boolean
  /** Presses a control exactly as a key on the keyboard would. */
  press: (control: Control) => void
  /** Crash guard (see GlideController.resume): a file that exists only
   *  while Glide is running. Optional so tests can leave it out. */
  runningMarkerPath?: string
  emitState: (state: GlideState) => void
  emitActivity: (activity: GlideActivity) => void
}

/**
 * Glide, owned by main: the on/off switch and zone count live in settings,
 * so Glide comes back on by itself at launch, keeps working with Noma's
 * window closed to the tray, and can be switched off from the tray at once.
 * Each recognised swipe-in is turned into a press here (resolveGlidePress
 * decides whether it may), rather than in the renderer, so nothing depends
 * on a page being open.
 */
export class GlideController {
  private readonly gestures: TrackpadGestureService
  private touchpads: number | null = null
  private error: string | null = null
  private touchCheckRunning = false

  constructor(private readonly host: GlideHost) {
    this.gestures = new TrackpadGestureService(
      (event) => this.handleGesture(event),
      () => host.getWindow()
    )
  }

  getState(): GlideState {
    return {
      enabled: getGlideEnabled(),
      zoneCount: getGlideZoneCount(),
      platformSupported: isWindows || isMac,
      touchpads: this.touchpads,
      error: this.error
    }
  }

  /**
   * At launch, once the main window exists: back on if it was on, unless
   * Noma crashed while Glide was running last time. Glide reads the
   * trackpad through native code that can take the whole app down (Mac
   * testing, 2026-10-05), and turning it straight back on at launch would
   * crash Noma every time it opened. The running marker is written when
   * Glide starts and removed on every clean stop or quit, so finding it
   * here means the last session ended while Glide was on.
   */
  resume(): void {
    if (this.host.runningMarkerPath && existsSync(this.host.runningMarkerPath)) {
      this.clearRunningMarker()
      setGlideEnabled(false)
      this.error = CRASHED_MESSAGE
      this.publish()
      return
    }
    if (getGlideEnabled()) this.setEnabled(true)
  }

  /** Turns Glide on or off and remembers it. Turning on fails (and stays
   *  off) when there's nothing to read, with the reason in `error`. */
  setEnabled(enabled: boolean): GlideState {
    if (!enabled) {
      setGlideEnabled(false)
      this.gestures.stop()
      this.clearRunningMarker()
      this.error = null
      return this.publish()
    }
    const status = this.start()
    setGlideEnabled(status !== null && status.touchpads > 0)
    return this.publish()
  }

  setZoneCount(zoneCount: HoloTrackpadZoneCount): GlideState {
    setGlideZoneCount(zoneCount)
    if (getGlideEnabled()) this.start()
    return this.publish()
  }

  /** Stops reading the touchpad without changing the saved setting: for
   *  shutdown, so no hook outlives the window it was registered on. */
  shutDown(): void {
    this.gestures.stop()
    this.clearRunningMarker()
    if (this.touchCheckRunning) this.gestures.stopTrace([])
    this.touchCheckRunning = false
  }

  startTouchCheck(): HoloTrackpadStatus | null {
    const status = this.gestures.startTrace()
    this.touchpads = status?.touchpads ?? this.touchpads
    this.touchCheckRunning = status !== null
    return status
  }

  stopTouchCheck(phases: CheckPhase[]): { summary: HoloTouchCheckSummary; savedTo: string } | null {
    this.touchCheckRunning = false
    return this.gestures.stopTrace(phases)
  }

  private start(): HoloTrackpadStatus | null {
    if (!isWindows && !isMac) {
      this.error = UNSUPPORTED_MESSAGE
      return null
    }
    if (!this.host.getWindow()) {
      this.error = NO_WINDOW_MESSAGE
      return null
    }
    // Written before the native touchpad code starts, so a crash while
    // starting is caught at the next launch too.
    this.writeRunningMarker()
    const status = this.gestures.start(getGlideZoneCount())
    this.touchpads = status?.touchpads ?? 0
    if (!status || status.touchpads === 0) {
      this.gestures.stop()
      this.clearRunningMarker()
      this.error = NO_TOUCHPAD_MESSAGE
      return status
    }
    this.error = null
    return status
  }

  private writeRunningMarker(): void {
    if (!this.host.runningMarkerPath) return
    try {
      writeFileSync(this.host.runningMarkerPath, new Date().toISOString())
    } catch (error) {
      console.warn('[glide] could not write the running marker:', error)
    }
  }

  private clearRunningMarker(): void {
    if (!this.host.runningMarkerPath) return
    try {
      rmSync(this.host.runningMarkerPath, { force: true })
    } catch (error) {
      console.warn('[glide] could not remove the running marker:', error)
    }
  }

  private publish(): GlideState {
    const state = this.getState()
    this.host.emitState(state)
    return state
  }

  private handleGesture(event: HoloTrackpadEvent): void {
    if (event.type === 'miss') {
      this.host.emitActivity(event)
      return
    }
    const context = this.host.getContext()
    const decision = resolveGlidePress({
      zone: event.zone,
      context,
      nomaFocused: this.host.isNomaFocused(),
      touchCheckRunning: this.touchCheckRunning,
      actionRunning: this.host.isActionRunning()
    })
    if (decision.control) this.host.press(decision.control)
    const control = decision.control ?? context.profile?.controls.find((item) => item.slot === decision.slot)
    // A control's label is kept to ~12 characters for the hardware's small
    // screen; a macro's own name is what the user actually called it.
    const actionName = decision.control
      ? (decision.control.action.type === 'macro' && getMacroById(decision.control.action.macroId)?.name) ||
        decision.control.label
      : undefined
    this.host.emitActivity({
      type: 'fire',
      zone: event.zone,
      slot: decision.slot,
      at: event.at,
      outcome: decision.outcome,
      controlLabel: control?.label,
      actionName,
      applicationName: context.application?.name
    })
  }
}
