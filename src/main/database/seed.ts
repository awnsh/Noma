import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type { ControlAction } from '@shared/types'

interface SeedControl {
  slot: number
  label: string
  action: ControlAction
}

interface SeedApplication {
  /** Must match the id WindowsOSAdapter derives from the exe filename (lowercased, no .exe). */
  id: string
  name: string
  processName: string
  profileName: string
  controls: SeedControl[]
}

/**
 * Starter profiles (brainstorm.md section 5) for applications likely to
 * already be installed on a development machine, so Milestone 1 ("the
 * keyboard changes when I change applications") is demoable immediately
 * without a profile editor. The profile system itself is generic — this
 * is just seed data, not a hardcoded assumption about which apps exist.
 */
const SEED_APPLICATIONS: SeedApplication[] = [
  {
    id: 'code',
    name: 'Visual Studio Code',
    processName: 'Code.exe',
    profileName: 'Developer',
    controls: [
      { slot: 1, label: 'RUN', action: { type: 'shortcut', keys: ['Control', 'F5'] } },
      { slot: 2, label: 'DEBUG', action: { type: 'shortcut', keys: ['F5'] } },
      { slot: 3, label: 'TERMINAL', action: { type: 'shortcut', keys: ['Control', '`'] } },
      { slot: 4, label: 'SEARCH', action: { type: 'shortcut', keys: ['Control', 'Shift', 'F'] } }
    ]
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    processName: 'chrome.exe',
    profileName: 'Browsing',
    controls: [
      { slot: 1, label: 'NEW TAB', action: { type: 'shortcut', keys: ['Control', 'T'] } },
      { slot: 2, label: 'CLOSE TAB', action: { type: 'shortcut', keys: ['Control', 'W'] } },
      { slot: 3, label: 'RELOAD', action: { type: 'shortcut', keys: ['Control', 'R'] } },
      { slot: 4, label: 'FIND', action: { type: 'shortcut', keys: ['Control', 'F'] } }
    ]
  },
  {
    id: 'spotify',
    name: 'Spotify',
    processName: 'Spotify.exe',
    profileName: 'Music',
    controls: [
      { slot: 1, label: 'PREVIOUS', action: { type: 'shortcut', keys: ['Control', 'Left'] } },
      { slot: 2, label: 'PLAY / PAUSE', action: { type: 'shortcut', keys: ['Space'] } },
      { slot: 3, label: 'NEXT', action: { type: 'shortcut', keys: ['Control', 'Right'] } },
      { slot: 4, label: 'VOLUME', action: { type: 'flowAction', action: 'volume' } }
    ]
  }
]

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
        processName: application.processName
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
          actionPayload: JSON.stringify(control.action)
        })
      }
    }
  })

  seedAll()
}
