import { createHash, randomBytes } from 'crypto'
import { GetForegroundWindow, GetWindowTextW } from '../actions/win32'
import { processForWindow } from '../actions/windowProcess'
import { getSetting, setSetting } from '../database/repositories/settingsRepository'
import { categoryOf } from './appKnowledge'
import { isWindows } from '../platform'

/**
 * Which browser tab a workflow step happened in, without keeping what the
 * tab was. A screenshot workflow often screenshots one tab and pastes into
 * another (a page, then a chat), and replay has to land in the right one.
 *
 * The tab is identified by its title (the browser window's title is the
 * active tab's), but only a fingerprint is kept: a SHA-256 of the title
 * mixed with a random secret made once per install, cut to 16 hex
 * characters. It can be compared with another tab's fingerprint on this
 * computer and nothing else; the title itself is read, hashed and dropped.
 * The user chose this over storing titles (2026-10-09).
 *
 * Windows only for now (window titles via GetWindowTextW); on a Mac every
 * call returns null, so steps simply carry no tab and replay doesn't switch.
 */

const SALT_KEY = 'tabFingerprintSalt'

function salt(): string {
  let value = getSetting(SALT_KEY)
  if (!value) {
    value = randomBytes(16).toString('hex')
    setSetting(SALT_KEY, value)
  }
  return value
}

/**
 * The part of a browser window title that names the tab: without the
 * browser's own suffix ("- Google Chrome", which a profile name may follow)
 * and without Edge's "and 3 more pages", which changes with the tab count.
 */
export function tabTitleFromWindowTitle(windowTitle: string): string {
  return windowTitle
    .replace(/\s+and \d+ more pages?\b/i, '')
    .replace(/\s+[-–—]\s+(Google Chrome|Microsoft​?\s?Edge|Brave|Opera|Mozilla Firefox|Firefox|Chromium|Vivaldi|Arc)\b.*$/i, '')
    .trim()
}

export function fingerprintTabTitle(title: string, secret: string = salt()): string {
  return createHash('sha256').update(`${secret}\n${title}`).digest('hex').slice(0, 16)
}

function windowTitle(hwnd: number): string {
  const buffer = Buffer.alloc(512 * 2)
  const length = GetWindowTextW(hwnd, buffer, 512) as number
  return length > 0 ? buffer.toString('utf16le', 0, length * 2) : ''
}

/** Whether `applicationId` is a browser (where tabs matter). */
export function isBrowserApp(applicationId: string | null): boolean {
  return categoryOf(applicationId) === 'browser'
}

/**
 * The fingerprint of the tab in front, when a browser is in front, else
 * null. `hwnd` defaults to the foreground window.
 */
export function currentTabFingerprint(hwnd?: number): string | null {
  if (!isWindows) return null
  try {
    const window = hwnd ?? (GetForegroundWindow() as number)
    if (!window) return null
    const process = processForWindow(window)
    if (!process || !isBrowserApp(process.processName.replace(/\.exe$/i, '').toLowerCase())) return null
    const title = tabTitleFromWindowTitle(windowTitle(window))
    return title ? fingerprintTabTitle(title) : null
  } catch {
    return null
  }
}
