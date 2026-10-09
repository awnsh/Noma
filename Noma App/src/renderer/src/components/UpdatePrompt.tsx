import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/types'
import { Modal } from './Modal'

/**
 * Asks to update as soon as a new version is ready, instead of leaving it
 * to be found in Settings or a system notification that's easy to miss.
 * Main checks at launch and every few hours and downloads in the
 * background (main/updater.ts), so this appears with the download done:
 * one click restarts into the new version. A copy that can't update itself
 * (an unsigned Mac build) gets "Download" instead.
 *
 * "Later" hides it for that version until Noma restarts; a downloaded
 * update installs on the next quit anyway, so the next launch is already
 * the new version.
 */
export function UpdatePrompt() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // A push can land before the first answer does; never let the older
    // answer overwrite it.
    let pushed = false
    const unsubscribe = window.flow.onUpdateStatus((next) => {
      pushed = true
      setStatus(next)
    })
    void window.flow.getUpdateStatus().then((first) => {
      if (!pushed) setStatus(first)
    })
    return unsubscribe
  }, [])

  const offer = status && (status.phase === 'ready' || status.phase === 'available') ? status : null
  if (!offer?.version || dismissed === offer.version) return null

  const later = (): void => setDismissed(offer.version)
  const ready = offer.phase === 'ready'

  return (
    <Modal onClose={later} titleId="update-prompt-title">
      <div className="text-xs uppercase tracking-widest text-neutral-500">Update</div>
      <h2 id="update-prompt-title" className="mt-1 font-display text-lg font-semibold text-neutral-100">
        Noma {offer.version} is {ready ? 'ready' : 'available'}
      </h2>
      <p className="mt-2 text-sm text-neutral-400">
        {ready
          ? `You have ${offer.currentVersion}. Restart to switch to the new version; it takes a few seconds.`
          : `You have ${offer.currentVersion}. Download the new version and install it over this one.`}
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={later}
          className="rounded-md px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
        >
          Later
        </button>
        <button
          type="button"
          autoFocus
          disabled={installing}
          onClick={() => {
            if (ready) {
              setInstalling(true)
              void window.flow.installUpdate()
            } else {
              void window.flow.openUpdateDownload()
              later()
            }
          }}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-60"
        >
          {ready ? (installing ? 'Restarting…' : 'Restart and update') : 'Download'}
        </button>
      </div>
    </Modal>
  )
}
