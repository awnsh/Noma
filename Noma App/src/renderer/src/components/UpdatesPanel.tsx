import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/types'
import { CARD } from '../lib/surfaces'

/**
 * "Check for updates". Noma also checks on its own every few hours
 * (main/updater.ts); this runs one now and shows where things stand,
 * including a download that the background check already started.
 */
export function UpdatesPanel() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    void window.flow.getUpdateStatus().then(setStatus)
    return window.flow.onUpdateStatus(setStatus)
  }, [])

  if (!status) return null

  const check = async (): Promise<void> => {
    setStatus({ ...status, phase: 'checking' })
    setStatus(await window.flow.checkForUpdates())
  }

  return (
    <section className={`mb-8 px-5 py-4 ${CARD}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-500">Updates</div>
          <p className={`mt-2 max-w-md text-sm ${status.phase === 'error' ? 'text-error' : 'text-neutral-400'}`}>
            {describe(status)}
          </p>
          {status.lastCheckedAt && status.phase !== 'checking' && (
            <p className="mt-1 text-xs text-neutral-600">Last checked {formatTime(status.lastCheckedAt)}</p>
          )}
        </div>
        <UpdateAction status={status} onCheck={() => void check()} />
      </div>
      {status.phase === 'downloading' && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-base-700">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${status.percent ?? 0}%` }} />
        </div>
      )}
    </section>
  )
}

function UpdateAction({ status, onCheck }: { status: UpdateStatus; onCheck: () => void }) {
  const primary = 'shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90'
  const secondary =
    'shrink-0 rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-200 hover:border-neutral-400 disabled:opacity-50 disabled:hover:border-base-600'

  switch (status.phase) {
    case 'unavailable':
    case 'downloading':
      return null
    case 'ready':
      return (
        <button type="button" onClick={() => void window.flow.installUpdate()} className={primary}>
          Restart to update
        </button>
      )
    case 'available':
      return (
        <button type="button" onClick={() => void window.flow.openUpdateDownload()} className={primary}>
          Download
        </button>
      )
    default:
      return (
        <button type="button" onClick={onCheck} disabled={status.phase === 'checking'} className={secondary}>
          {status.phase === 'checking' ? 'Checking…' : 'Check for updates'}
        </button>
      )
  }
}

function describe(status: UpdateStatus): string {
  const current = `You have version ${status.currentVersion}.`
  switch (status.phase) {
    case 'unavailable':
      return `${current} Development build; updates apply to installed copies only.`
    case 'checking':
      return `${current} Checking for a newer version…`
    case 'up-to-date':
      return `${current} Up to date.`
    case 'available':
      return `Version ${status.version} is out. Download it and install it over this one; your settings and workflows stay.`
    case 'downloading':
      return `Downloading version ${status.version}${status.percent ? ` (${status.percent}%)` : ''}…`
    case 'ready':
      return `Version ${status.version} is ready. It installs the next time Noma quits, or restart now.`
    case 'error':
      return `${current} Couldn't reach the update server. Check your connection and try again.`
    default:
      return `${current} Noma checks for updates on its own every few hours.`
  }
}

function formatTime(at: number): string {
  const sameDay = new Date(at).toDateString() === new Date().toDateString()
  return sameDay
    ? `at ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : `on ${new Date(at).toLocaleDateString()}`
}
