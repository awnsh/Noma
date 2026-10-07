import type { HoloTrackpadEvent, HoloTrackpadZone, HoloTrackpadZoneCount } from '@shared/types'

/**
 * Holo's trackpad swipe-in: slide a finger from the empty palm rest beside
 * the trackpad onto it, a quick flick, and that side's control fires.
 *
 * Why this gesture: on Windows a quick tap on the trackpad is already a
 * click, and an app can watch the trackpad but can't stop Windows acting on
 * it, so taps are out. Holding a finger still worked but made people wait.
 * A finger sliding in from outside the pad is quick, never clicks (it
 * moves), and has a signature normal use almost never produces: it is first
 * seen at the very edge of the pad, already travelling inward. People put a
 * finger down on the pad, not on its last few millimetres. Which side, and
 * (with four zones) which half, is a measured position, not a guess.
 *
 * The only side effect is the pointer moving a little; the service puts it
 * back (trackpadGestureService.ts). Every other rule is there for one
 * specific accident:
 * - First seen within EDGE_START of the left or right edge. A finger that
 *   lands further in and then moves outward or along is pointer use.
 * - Travels inward at least MIN_TRAVEL within MAX_SWIPE_MS, mostly
 *   sideways (MAX_SLOPE). A slow drift from the edge is someone moving the
 *   pointer; a mostly vertical stroke is someone scrolling along the side.
 * - One finger, the pad not pressed down (a click), not flagged as a palm.
 * - No typing before or during it. A hand moving from the keyboard
 *   brushes the pad's edge more than anything else does.
 * - Once per touch, then a short cooldown.
 *
 * Pure (no Win32, no timers) so it can be tested: the service feeds it
 * frames and key timestamps.
 */

/*
 * Set from the user's own touch check (2026-10-03, ASUS Precision Touchpad,
 * 46 swipe-ins and 42 ordinary touches; re-score with the touch check's
 * replay, touchTrace.ts). Sliding-in fingers were first seen 0-2.4% from the
 * edge (median 0.4% left, 0.7% right); swipes travelled 7-30% of the width
 * and covered the first 8% in 28-117 ms. With these values 44 of 46 swipes fire on the right
 * side; ordinary use fired once, on a quick inward flick from the very edge
 * that no threshold here can tell from a swipe-in.
 */

/** First contact within this fraction of the pad's width from a side. Real
 *  swipe-ins were first seen within 2.4%; the margin covers other pads. */
export const EDGE_START = 0.06
/** How far inward (fraction of the pad's width) the finger must travel.
 *  Quick right-side flicks travelled as little as 7-9%; 15% missed them. */
export const MIN_TRAVEL = 0.08
/** ...within this long of first appearing. Real swipes covered it in
 *  28-117 ms; dragging the pointer from the edge is far slower, and with a
 *  travel this short, speed is what tells the two apart. */
export const MAX_SWIPE_MS = 150
/** Vertical travel may be at most this times the horizontal travel. */
export const MAX_SLOPE = 0.9
/** No key presses for this long before the finger arrives. */
export const TYPING_QUIET_MS = 600
/** After firing, ignore new swipes for this long: enough that one
 *  flick can't fire twice. At 600 ms it swallowed every second swipe of
 *  someone swiping about twice a second (9 of 19 caught; 18 of 19 at 250). */
export const COOLDOWN_MS = 250

export interface TouchContact {
  id: number
  /** Finger touching the pad. */
  tip: boolean
  /** The touchpad's own "this is a finger, not a palm" bit. */
  confident: boolean
  /** 0..1 across the pad, left to right / top to bottom. */
  x: number
  y: number
}

export interface TouchFrame {
  device: number
  contacts: TouchContact[]
  /** Fingers the touchpad says are down (may exceed `contacts` when a
   *  frame is split across reports). */
  contactCount: number
  /** The pad itself is pressed down (a clickpad's physical click). */
  clicked?: boolean
}

/** Which zone a swipe that started at (x, y) on `side` belongs to. */
export function zoneFor(side: 'left' | 'right', y: number, zones: HoloTrackpadZoneCount): HoloTrackpadZone {
  if (zones === 2 || y < 0.5) return side === 'left' ? 'topLeft' : 'topRight'
  return side === 'left' ? 'bottomLeft' : 'bottomRight'
}

/** The side a first contact at `x` came in from, if it's at an edge. */
export function edgeAt(x: number, edgeStart = EDGE_START): 'left' | 'right' | null {
  if (x <= edgeStart) return 'left'
  if (x >= 1 - edgeStart) return 'right'
  return null
}

interface Swipe {
  device: number
  id: number
  side: 'left' | 'right'
  zone: HoloTrackpadZone
  startAt: number
  x: number
  y: number
}

type MissReason = Extract<HoloTrackpadEvent, { type: 'miss' }>['reason']

/** Every threshold above, overridable per detector so a touch check can be
 *  replayed against different values (scripts, tests). The app uses the
 *  defaults. */
export interface GestureTuning {
  edgeStart: number
  minTravel: number
  maxSwipeMs: number
  maxSlope: number
  typingQuietMs: number
  cooldownMs: number
}

export const DEFAULT_TUNING: GestureTuning = {
  edgeStart: EDGE_START,
  minTravel: MIN_TRAVEL,
  maxSwipeMs: MAX_SWIPE_MS,
  maxSlope: MAX_SLOPE,
  typingQuietMs: TYPING_QUIET_MS,
  cooldownMs: COOLDOWN_MS
}

export class TrackpadGestureDetector {
  private readonly tuning: GestureTuning

  constructor(tuning: Partial<GestureTuning> = {}) {
    this.tuning = { ...DEFAULT_TUNING, ...tuning }
  }

  private swipe: Swipe | null = null
  /** Per device: contact IDs down in the last frame, so only a finger
   *  arriving now can start a swipe. */
  private readonly down = new Map<number, Set<number>>()
  /** Contacts already judged (fired or missed): one verdict per touch. */
  private readonly judged = new Set<string>()
  private lastKeyAt = -Infinity
  private cooldownUntil = -Infinity
  private zones: HoloTrackpadZoneCount = 4
  /** The contact that fired most recently (the service restores the
   *  pointer when it lifts). */
  lastFired: { device: number; id: number } | null = null

  setZoneCount(zones: HoloTrackpadZoneCount): void {
    this.zones = zones
    this.reset()
  }

  frame(frame: TouchFrame, now: number): HoloTrackpadEvent[] {
    const events: HoloTrackpadEvent[] = []
    const active = frame.contacts.filter((contact) => contact.tip)
    const fingers = Math.max(active.length, frame.contactCount)
    const wasDown = this.down.get(frame.device) ?? new Set<number>()
    const key = (id: number): string => `${frame.device}:${id}`

    // A finger arriving at an edge starts a candidate swipe.
    if (!this.swipe) {
      for (const contact of active) {
        if (wasDown.has(contact.id) || this.judged.has(key(contact.id))) continue
        const side = edgeAt(contact.x, this.tuning.edgeStart)
        if (!side) continue
        const miss = (reason: MissReason): void => {
          this.judged.add(key(contact.id))
          events.push({ type: 'miss', zone: zoneFor(side, contact.y, this.zones), at: now, reason })
        }
        if (now - this.lastKeyAt < this.tuning.typingQuietMs) miss('typing')
        else if (now < this.cooldownUntil) this.judged.add(key(contact.id))
        else {
          this.swipe = {
            device: frame.device,
            id: contact.id,
            side,
            zone: zoneFor(side, contact.y, this.zones),
            startAt: now,
            x: contact.x,
            y: contact.y
          }
        }
        break
      }
    }

    const swipe = this.swipe
    if (swipe && swipe.device === frame.device) {
      const contact = frame.contacts.find((item) => item.id === swipe.id)
      const end = (event: HoloTrackpadEvent | null): void => {
        this.swipe = null
        this.judged.add(key(swipe.id))
        if (event) events.push(event)
      }
      const miss = (reason: MissReason): void => end({ type: 'miss', zone: swipe.zone, at: now, reason })
      if (!contact || !contact.tip) {
        // Lifted before travelling far enough: an edge tap or a short
        // brush. Not worth a message unless it at least moved inward.
        end(null)
      } else if (frame.clicked) miss('click')
      else if (fingers > 1) miss('second-finger')
      else if (!contact.confident) miss('palm')
      else {
        const inward = swipe.side === 'left' ? contact.x - swipe.x : swipe.x - contact.x
        const vertical = Math.abs(contact.y - swipe.y)
        if (now - swipe.startAt > this.tuning.maxSwipeMs) miss('too-slow')
        else if (inward >= this.tuning.minTravel) {
          if (vertical > inward * this.tuning.maxSlope) miss('not-sideways')
          else {
            this.cooldownUntil = now + this.tuning.cooldownMs
            this.lastFired = { device: frame.device, id: swipe.id }
            end({ type: 'fire', zone: swipe.zone, at: now })
          }
        }
      }
    }

    // Forget verdicts for fingers that have lifted (IDs get reused).
    const nowDown = new Set(active.map((contact) => contact.id))
    for (const id of wasDown) if (!nowDown.has(id)) this.judged.delete(key(id))
    this.down.set(frame.device, nowDown)
    return events
  }

  noteKey(now: number): HoloTrackpadEvent[] {
    this.lastKeyAt = now
    const swipe = this.swipe
    if (!swipe) return []
    this.swipe = null
    this.judged.add(`${swipe.device}:${swipe.id}`)
    return [{ type: 'miss', zone: swipe.zone, at: now, reason: 'typing' }]
  }

  reset(): void {
    this.swipe = null
    this.down.clear()
    this.judged.clear()
  }
}
