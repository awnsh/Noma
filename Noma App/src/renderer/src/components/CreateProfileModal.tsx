import { useState } from 'react'
import type { Application, ApplicationProfile } from '@shared/types'

interface CreateProfileModalProps {
  /** When given (the Dashboard's "create a profile for what's focused
   *  right now" flow), the application is already known and its fields are
   *  locked. When omitted (the Profiles page's manual flow, for an
   *  application Flow hasn't detected yet), the user fills them in by
   *  hand. */
  application?: Application
  onClose: () => void
  onCreated: (profile: ApplicationProfile) => void
}

/** Matches how WindowsOSAdapter derives an id from a real detected window
 *  (lowercased exe filename, no extension) — an id typed here has to agree
 *  with that or the profile will never actually match a real detection. */
function normalizeId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\.exe$/, '')
    .replace(/\s+/g, '-')
}

export function CreateProfileModal({ application, onClose, onCreated }: CreateProfileModalProps) {
  const [id, setId] = useState(application?.id ?? '')
  const [displayName, setDisplayName] = useState(application?.name ?? '')
  const [processName, setProcessName] = useState(application?.processName ?? '')
  const [profileName, setProfileName] = useState(application?.name ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizedId = normalizeId(id)
  const canSave =
    normalizedId.length > 0 &&
    displayName.trim().length > 0 &&
    processName.trim().length > 0 &&
    profileName.trim().length > 0

  const handleCreate = async (): Promise<void> => {
    setIsSaving(true)
    setError(null)
    const target: Application = application ?? {
      id: normalizedId,
      name: displayName.trim(),
      processName: processName.trim()
    }
    const profile = await window.flow.createProfileForApplication(target, profileName.trim())
    setIsSaving(false)
    if (profile) {
      onCreated(profile)
    } else {
      setError(`${target.name} already has a profile — refresh and edit it instead of creating a new one.`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-base-900 p-6 shadow-2xl shadow-black/60">
        <h2 className="mb-1 text-lg font-semibold text-neutral-100">
          {application ? `Create a profile for ${application.name}` : 'Create a new application profile'}
        </h2>
        <p className="mb-5 text-xs text-neutral-500">
          Starts with 4 empty controls — configure them afterward with the Control Mapping Editor.
        </p>

        {!application && (
          <>
            <div className="mb-3">
              <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-500">
                Application ID
              </label>
              <input
                type="text"
                value={id}
                onChange={(event) => setId(event.target.value)}
                placeholder="e.g. notepad"
                className="w-full rounded-md border border-white/10 bg-base-950 px-3 py-2 font-mono text-sm text-neutral-100"
              />
              <p className="mt-1 text-[11px] text-neutral-600">
                Must match the .exe filename (lowercase, no extension) so a real detection finds it —
                normalized to <span className="font-mono">{normalizedId || '—'}</span>.
              </p>
            </div>
            <div className="mb-3">
              <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-500">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. Notepad"
                className="w-full rounded-md border border-white/10 bg-base-950 px-3 py-2 text-sm text-neutral-100"
              />
            </div>
            <div className="mb-3">
              <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-500">
                Process filename
              </label>
              <input
                type="text"
                value={processName}
                onChange={(event) => setProcessName(event.target.value)}
                placeholder="e.g. notepad.exe"
                className="w-full rounded-md border border-white/10 bg-base-950 px-3 py-2 font-mono text-sm text-neutral-100"
              />
            </div>
          </>
        )}

        <div className="mb-5">
          <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-500">
            Profile name
          </label>
          <input
            type="text"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            placeholder="e.g. Writing"
            className="w-full rounded-md border border-white/10 bg-base-950 px-3 py-2 text-sm text-neutral-100"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-white/10 px-3 py-2 text-xs text-neutral-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSave || isSaving}
            className="rounded-md border border-accent-muted bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? 'Creating…' : 'Create profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
