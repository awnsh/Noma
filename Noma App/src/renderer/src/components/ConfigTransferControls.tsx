import { useState } from 'react'
import type { ConfigCounts, ConfigImportMode, ConfigImportPickResult, ConfigImportPreview } from '@shared/types'
import { plural } from '../lib/plural'
import { formatAbsoluteTime } from '../lib/formatRelativeTime'
import { useApplicationsStore } from '../stores/applicationsStore'
import { useMacrosStore } from '../stores/macrosStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { useFlowStore } from '../stores/flowStore'

type ReadyImport = Extract<ConfigImportPickResult, { status: 'ready' }>
type Message = { tone: 'ok' | 'error'; text: string } | null

function describeCounts(counts: ConfigCounts): string {
  return [
    `${counts.profiles} ${plural(counts.profiles, 'profile')}`,
    `${counts.controls} ${plural(counts.controls, 'zone action')}`,
    `${counts.macros} ${plural(counts.macros, 'macro')}`
  ].join(', ')
}

function describeChange(parts: Array<[number, string]>): string {
  const said = parts.filter(([n]) => n > 0).map(([n, word]) => `${n} ${word}`)
  return said.length > 0 ? said.join(', ') : 'no change'
}

function PreviewLines({ preview }: { preview: ConfigImportPreview }) {
  const rows: Array<[string, string]> = [
    [
      'Profiles',
      describeChange([
        [preview.profiles.added, 'added'],
        [preview.profiles.replaced, 'replaced'],
        [preview.profiles.removed, 'removed']
      ])
    ],
    [
      'Zone actions',
      describeChange([
        [preview.controls.added, 'from the file'],
        [preview.controls.removed, 'removed']
      ])
    ],
    [
      'Macros',
      describeChange([
        [preview.macros.added, 'added'],
        [preview.macros.replaced, 'replaced'],
        [preview.macros.removed, 'removed']
      ])
    ]
  ]
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-neutral-500">{label}</dt>
          <dd className="text-neutral-300">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const MODE_COPY: Record<ConfigImportMode, { label: string; hint: string }> = {
  merge: {
    label: 'Merge',
    hint: 'Apps in the file get its zones. Other apps and your other macros stay.'
  },
  replace: {
    label: 'Replace',
    hint: 'Every profile, zone action and macro here is replaced by the file’s.'
  }
}

/**
 * Export and import of the user's own configuration (profiles, zone
 * actions, macros), on the Your Data panel next to Clear and Delete.
 * Import shows what would change before anything is written, and the
 * write itself is one transaction in the main process.
 */
export function ConfigTransferControls() {
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<ReadyImport | null>(null)
  const [mode, setMode] = useState<ConfigImportMode>('merge')
  const [message, setMessage] = useState<Message>(null)
  const refreshApplications = useApplicationsStore((state) => state.refresh)
  const refreshMacros = useMacrosStore((state) => state.refresh)
  const refreshWorkflow = useWorkflowStore((state) => state.refresh)
  const refreshFlow = useFlowStore((state) => state.refresh)

  const handleExport = async (): Promise<void> => {
    setBusy(true)
    setMessage(null)
    const result = await window.flow.exportConfiguration()
    setBusy(false)
    if (result.status === 'saved') {
      setMessage({ tone: 'ok', text: `Settings exported: ${describeCounts(result.counts)}.` })
    } else if (result.status === 'failed') {
      setMessage({ tone: 'error', text: `Couldn’t export settings. ${result.reason}` })
    }
  }

  const handlePick = async (): Promise<void> => {
    setBusy(true)
    setMessage(null)
    setPending(null)
    const result = await window.flow.pickConfigurationImport()
    setBusy(false)
    if (result.status === 'ready') {
      setMode('merge')
      setPending(result)
    } else if (result.status === 'invalid') {
      setMessage({ tone: 'error', text: `Couldn’t import that file. ${result.reason} Nothing was changed.` })
    }
  }

  const handleApply = async (): Promise<void> => {
    if (!pending) return
    setBusy(true)
    const result = await window.flow.applyConfigurationImport(pending.token, mode)
    setBusy(false)
    setPending(null)
    if (result.ok) {
      setMessage({ tone: 'ok', text: `Settings imported: ${describeCounts(result.counts)}.` })
      await Promise.all([refreshApplications(), refreshMacros(), refreshWorkflow(), refreshFlow()])
    } else {
      setMessage({ tone: 'error', text: result.reason })
    }
  }

  const exportedAt = pending?.exportedAt ? Date.parse(pending.exportedAt) : NaN

  return (
    <div className="mt-4 border-t border-white/[0.08] pt-4">
      <p className="max-w-md text-xs text-neutral-500">
        Your profiles, zone actions and macros as a file, to back up or move to another computer.
        Nothing Flow has learned is included.
      </p>

      {message && (
        <div
          role="status"
          className={`mt-3 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs ${
            message.tone === 'ok'
              ? 'border-accent-muted bg-accent/10 text-accent'
              : 'border-red-900/60 bg-red-950/20 text-red-300'
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className={message.tone === 'ok' ? 'text-accent/70 hover:text-accent' : 'text-red-400/80 hover:text-red-300'}
          >
            Dismiss
          </button>
        </div>
      )}

      {pending ? (
        <div className="mt-3 rounded-md border border-accent-muted bg-accent/10 px-3 py-3 text-xs">
          <div className="text-accent">
            Import <span className="font-medium">{pending.fileName}</span>?
          </div>
          <div className="mt-0.5 text-neutral-500">
            {describeCounts(pending.counts)}
            {Number.isFinite(exportedAt) && <> · exported {formatAbsoluteTime(exportedAt)}</>}
          </div>

          <div role="radiogroup" aria-label="How to import" className="mt-3 flex gap-1.5">
            {(Object.keys(MODE_COPY) as ConfigImportMode[]).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={mode === option}
                onClick={() => setMode(option)}
                className={`rounded-md border px-2.5 py-1 font-medium active:scale-[0.97] ${
                  mode === option
                    ? 'border-accent/40 bg-accent/15 text-accent'
                    : 'border-white/10 text-neutral-400 hover:text-neutral-100'
                }`}
              >
                {MODE_COPY[option].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-neutral-400">{MODE_COPY[mode].hint}</p>

          <PreviewLines preview={pending.previews[mode]} />

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleApply()}
              className="font-semibold text-accent hover:text-accent/80"
            >
              {busy ? 'Working…' : 'Import'}
            </button>
            <button type="button" onClick={() => setPending(null)} className="text-neutral-500 hover:text-neutral-300">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <TransferButton label="Export Settings" disabled={busy} onClick={() => void handleExport()} />
          <TransferButton label="Import Settings" disabled={busy} onClick={() => void handlePick()} />
        </div>
      )}
    </div>
  )
}

function TransferButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-accent-muted hover:text-neutral-100 active:scale-[0.97] disabled:opacity-60"
    >
      {label}
    </button>
  )
}
