import { app } from 'electron'
import type { WhatsNew } from '@shared/types'
import { notesSince } from '@shared/releaseNotes'
import { getSetting, setSetting } from './database/repositories/settingsRepository'
import { getOnboardingState } from './database/repositories/onboardingRepository'

/** The last version whose notes were shown (or a fresh install's first). */
const LAST_SEEN_KEY = 'lastSeenVersion'

let pending: WhatsNew | null = null

/**
 * Decides once, at launch, whether this launch follows an update. Done here
 * rather than when the window asks, because the window only asks after
 * onboarding: by then a brand-new user would look like one who updated.
 */
export function initWhatsNew(): void {
  const current = app.getVersion()
  const lastSeen = readLastSeen()

  if (lastSeen === null && !getOnboardingState().completed) {
    // A fresh install: nothing changed for them.
    writeLastSeen(current)
    return
  }
  if (lastSeen === current) return

  const releases = notesSince(lastSeen, current)
  if (releases.length === 0) {
    writeLastSeen(current)
    return
  }
  pending = { version: current, releases }
}

export function getWhatsNew(): WhatsNew | null {
  return pending
}

export function markWhatsNewSeen(): void {
  pending = null
  writeLastSeen(app.getVersion())
}

function readLastSeen(): string | null {
  return getSetting(LAST_SEEN_KEY) ?? null
}

function writeLastSeen(version: string): void {
  setSetting(LAST_SEEN_KEY, version)
}
