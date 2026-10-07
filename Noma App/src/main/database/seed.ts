import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type { ControlAction } from '@shared/types'
import { isMac } from '../platform'

interface SeedControl {
  slot: number
  label: string
  action: ControlAction
  /** The same shortcut on macOS, where it differs (usually Cmd for Ctrl). */
  macKeys?: string[]
}

/** A seed control's action for the OS Noma is running on. */
function actionForPlatform(control: SeedControl): ControlAction {
  if (isMac && control.macKeys && control.action.type === 'shortcut') {
    return { ...control.action, keys: control.macKeys }
  }
  return control.action
}

interface SeedApplication {
  /** Must match the id the OS adapter derives: the exe filename on Windows
   *  (lowercased, no .exe); on macOS the same id via macAdapter.ts's aliases. */
  id: string
  name: string
  processName: string
  /** The executable inside the .app bundle. Only a first guess: live
   *  detection replaces it (applicationsRepository.upsertApplication). */
  macProcessName: string
  profileName: string
  controls: SeedControl[]
}

/**
 * Starter profiles (brainstorm.md section 5) for applications likely to
 * already be installed on a development machine, so Milestone 1 ("the
 * keyboard changes when I change applications") is demoable immediately
 * without a profile editor. The profile system itself is generic: this
 * is seed data, not a hardcoded assumption about which apps exist.
 */
const SEED_APPLICATIONS: SeedApplication[] = [
  {
    id: 'code',
    name: 'Visual Studio Code',
    processName: 'Code.exe',
    macProcessName: 'Electron',
    profileName: 'Developer',
    controls: [
      { slot: 1, label: 'RUN', action: { type: 'shortcut', keys: ['Control', 'F5'] } },
      { slot: 2, label: 'DEBUG', action: { type: 'shortcut', keys: ['F5'] } },
      { slot: 3, label: 'TERMINAL', action: { type: 'shortcut', keys: ['Control', 'Backquote'] } },
      { slot: 4, label: 'SEARCH', action: { type: 'shortcut', keys: ['Control', 'Shift', 'F'] }, macKeys: ['Meta', 'Shift', 'F'] }
    ]
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    processName: 'chrome.exe',
    macProcessName: 'Google Chrome',
    profileName: 'Browsing',
    controls: [
      { slot: 1, label: 'NEW TAB', action: { type: 'shortcut', keys: ['Control', 'T'] }, macKeys: ['Meta', 'T'] },
      // v0.1: was CLOSE WINDOW (WM_CLOSE). Slot 2 is Glide's upper-right
      // zone, the one a new user's stray right-side swipe lands in, and a
      // default that can close the whole browser is the wrong first
      // accident. Reopen tab is harmless and pairs with New tab. Closing is
      // still one choice away in the zone editor.
      { slot: 2, label: 'REOPEN TAB', action: { type: 'shortcut', keys: ['Control', 'Shift', 'T'] }, macKeys: ['Meta', 'Shift', 'T'] },
      { slot: 3, label: 'RELOAD', action: { type: 'shortcut', keys: ['Control', 'R'] }, macKeys: ['Meta', 'R'] },
      { slot: 4, label: 'FIND', action: { type: 'shortcut', keys: ['Control', 'F'] }, macKeys: ['Meta', 'F'] }
    ]
  },
  {
    id: 'spotify',
    name: 'Spotify',
    processName: 'Spotify.exe',
    macProcessName: 'Spotify',
    profileName: 'Music',
    controls: [
      { slot: 1, label: 'PREVIOUS', action: { type: 'shortcut', keys: ['Control', 'ArrowLeft'] }, macKeys: ['Meta', 'ArrowLeft'] },
      { slot: 2, label: 'PLAY / PAUSE', action: { type: 'shortcut', keys: ['Space'] } },
      { slot: 3, label: 'NEXT', action: { type: 'shortcut', keys: ['Control', 'ArrowRight'] }, macKeys: ['Meta', 'ArrowRight'] },
      // A single button can't do continuous volume (that's what a future
      // Rotary Encoder Module is for); mute/unmute toggle is the honest,
      // demonstrable action a discrete control can actually perform.
      { slot: 4, label: 'MUTE', action: { type: 'systemCommand', command: 'volumeMute' } }
    ]
  }
]

/**
 * The original seed control for a given application/slot, if that
 * application was seeded; used by the Control Mapping Editor's "Reset to
 * default" action. Returns null for an application that was never seeded
 * (there's no "default" to reset to), which the caller must treat as "no
 * reset available", not an error.
 */
export function getSeedDefaultControl(
  applicationId: string,
  slot: number
): { label: string; action: ControlAction } | null {
  const application = SEED_APPLICATIONS.find((app) => app.id === applicationId)
  const control = application?.controls.find((c) => c.slot === slot)
  return control ? { label: control.label, action: actionForPlatform(control) } : null
}

/** Seeds starter profiles once, on an empty database. Never overwrites user data. */
export function seedDefaultProfiles(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM applications').get() as {
    count: number
  }
  if (existing.count > 0) return

  const insertApplication = db.prepare(
    'INSERT INTO applications (id, name, process_name) VALUES (@id, @name, @processName)'
  )
  const insertProfile = db.prepare(
    'INSERT INTO profiles (id, application_id, name) VALUES (@id, @applicationId, @name)'
  )
  const insertControl = db.prepare(
    `INSERT INTO controls (id, profile_id, slot, label, action_type, action_payload)
     VALUES (@id, @profileId, @slot, @label, @actionType, @actionPayload)`
  )

  const seedAll = db.transaction(() => {
    for (const application of SEED_APPLICATIONS) {
      insertApplication.run({
        id: application.id,
        name: application.name,
        processName: isMac ? application.macProcessName : application.processName
      })

      const profileId = `${application.id}-default`
      insertProfile.run({ id: profileId, applicationId: application.id, name: application.profileName })

      for (const control of application.controls) {
        insertControl.run({
          id: randomUUID(),
          profileId,
          slot: control.slot,
          label: control.label,
          actionType: control.action.type,
          actionPayload: JSON.stringify(actionForPlatform(control))
        })
      }
    }
  })

  seedAll()
}
