import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { MacEdgeSwipeState } from '@shared/types'
import { isMac } from '../platform'

/**
 * macOS opens Notification Center when two fingers swipe in from the right
 * edge of the trackpad. A Glide swipe from the palm rest looks like exactly
 * that (the palm is a second contact), so on the right side the system
 * gesture fires alongside Glide's. Glide only listens to the trackpad and
 * cannot stop it, so the fix is the system setting itself, which the user
 * turns off from the Glide page (and can turn back on). Reading and writing
 * it is `defaults` on the two preference domains macOS keeps it in (the
 * built-in trackpad, and a Magic Trackpad).
 */
const DOMAINS = ['com.apple.AppleMultitouchTrackpad', 'com.apple.driver.AppleBluetoothMultitouch.trackpad'] as const
const KEY = 'TrackpadTwoFingerFromRightEdgeSwipeGesture'
/** The value System Settings writes when the gesture is on. */
const ON_VALUE = 3

const execFileAsync = promisify(execFile)

async function readValue(domain: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('defaults', ['read', domain, KEY])
    const value = Number(stdout.trim())
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

/** Whether the gesture is on, from what each domain reports. A domain that
 *  doesn't have the key (no Magic Trackpad) is ignored; if none has it, the
 *  macOS default applies, which is on. */
export function edgeSwipeEnabled(values: Array<number | null>): boolean {
  const known = values.filter((value): value is number => value !== null)
  return known.length === 0 || known.some((value) => value !== 0)
}

export async function getMacEdgeSwipe(): Promise<MacEdgeSwipeState> {
  if (!isMac) return { supported: false, enabled: false }
  return { supported: true, enabled: edgeSwipeEnabled(await Promise.all(DOMAINS.map(readValue))) }
}

export async function setMacEdgeSwipe(enabled: boolean): Promise<MacEdgeSwipeState> {
  if (!isMac) return { supported: false, enabled: false }
  const value = enabled ? String(ON_VALUE) : '0'
  await Promise.all(DOMAINS.map((domain) => execFileAsync('defaults', ['write', domain, KEY, '-int', value])))
  return getMacEdgeSwipe()
}
