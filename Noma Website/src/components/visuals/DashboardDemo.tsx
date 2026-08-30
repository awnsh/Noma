// A faithful interactive recreation of the real app's Dashboard page
// (src/renderer/src/pages/Dashboard.tsx) — same structure (Current Application
// -> Current Controls -> Suggestions -> Flow Status), driven by local state
// instead of the real app's window.flow IPC bridge (which only exists inside
// Electron; see AppPreview.tsx's doc comment for why). Switching applications
// here is standing in for what happens automatically when Windows reports a
// new foreground app — the controls below update the same way either way.
//
// The suggestion card is a simplified port of the real app's SuggestionCard
// (src/renderer/src/components) — same shape (confidence, Accept picks a
// slot to assign into, Reject/Dismiss just clear it), tinted flow violet to
// match every other "Flow noticed a pattern" moment on the site.

import { useState } from 'react'
import AppControlTile from './AppControlTile'
import { appProfiles } from '../../data/appProfiles'
import { controlKeys, formatShortcutCaption } from '../../data/controlActions'

const apps = [appProfiles.vscode, appProfiles.premiere, appProfiles.solidworks, appProfiles.chrome]

const flowStatusByApp: Record<string, string> = {
  premiere: 'Flow is learning your workflow.',
  solidworks: 'Flow is learning your workflow.',
  chrome: "Flow isn't learning yet.",
}

// The one seeded suggestion — mirrors the same "Command Palette before Git
// Commit, 27 times this week" pattern the Interactive Demo section and the
// Macro Studio's "Quick Commit" macro both reference, so all three tabs tell
// the same, consistent Flow story rather than three unrelated ones.
const SUGGESTION = {
  title: 'Add Command Palette to your controls',
  explanation: "You've opened the Command Palette right before Git Commit 27 times this week.",
  confidence: 92,
}

export default function DashboardDemo() {
  const [activeId, setActiveId] = useState('vscode')
  const [status, setStatus] = useState<'pending' | 'picking' | 'resolved'>('pending')
  const [override, setOverride] = useState<string[] | null>(null)
  const [justAdded, setJustAdded] = useState<number | null>(null)

  const active = apps.find((a) => a.id === activeId)!
  const controls = activeId === 'vscode' && override ? override : active.controls
  const showSuggestion = activeId === 'vscode' && status !== 'resolved'

  const accept = (slot: number) => {
    const next = [...(override ?? active.controls)]
    next[slot - 1] = 'Command Palette'
    setOverride(next)
    setStatus('resolved')
    setJustAdded(slot)
    window.setTimeout(() => setJustAdded(null), 1200)
  }

  const flowStatus =
    activeId === 'vscode'
      ? status === 'resolved'
        ? 'Flow is noticing patterns.'
        : 'Flow noticed something — see below.'
      : flowStatusByApp[activeId]

  return (
    <div className="p-3 sm:p-8">
      {/* app switcher — standing in for Windows reporting a new foreground app */}
      <div className="mb-6 flex flex-wrap gap-2">
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => setActiveId(app.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              app.id === activeId ? 'bg-accent/10 text-accent' : 'text-base-400 hover:text-base-100'
            }`}
          >
            {app.color && (
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: app.color }} />
            )}
            {app.shortName}
          </button>
        ))}
      </div>

      <section className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-base-500">Current Application</div>
        <div className="mt-1.5 text-2xl font-semibold text-base-100">{active.name}</div>
        <div className="mt-1 text-sm text-base-400">Active profile: {active.shortName}</div>
      </section>

      <section className="mb-8">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-base-500">Current Controls</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((slot) => {
            const label = controls[slot - 1]
            const keys = label ? controlKeys[label] : undefined
            return (
              <div key={slot} className="relative">
                <AppControlTile slot={slot} label={label} caption={keys && formatShortcutCaption(keys)} />
                {justAdded === slot && (
                  <span className="absolute -right-1.5 -top-1.5 rounded-full bg-flow px-1.5 py-0.5 text-[9px] font-medium text-base-950">
                    Added
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {showSuggestion && (
        <section className="mb-8 rounded-xl border border-flow/30 bg-flow/[0.05] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-base-100">{SUGGESTION.title}</div>
              <p className="mt-1 text-sm text-base-400">{SUGGESTION.explanation}</p>
            </div>
            <div
              className="shrink-0 rounded-full border border-base-600 px-2 py-0.5 text-[10px] uppercase tracking-widest text-base-500"
              title="Confidence"
            >
              {SUGGESTION.confidence}%
            </div>
          </div>

          {status === 'pending' ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('picking')}
                className="rounded-md border border-flow-dim bg-flow/10 px-3 py-1 text-xs font-medium text-flow hover:bg-flow/20"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => setStatus('resolved')}
                className="rounded-md border border-base-600 px-3 py-1 text-xs text-base-400 hover:border-base-400 hover:text-base-200"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => setStatus('resolved')}
                className="rounded-md px-3 py-1 text-xs text-base-600 hover:text-base-400"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-base-700 bg-base-950 p-3">
              <p className="mb-2 text-xs text-base-500">Assign to which control? This replaces whatever&rsquo;s there.</p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => accept(slot)}
                    className="rounded-md border border-base-700 bg-base-900 px-2 py-2 text-center text-xs text-base-300 hover:border-flow-dim hover:text-base-100"
                  >
                    <div className="text-[9px] uppercase tracking-widest text-base-600">{slot}</div>
                    <div className="mt-0.5 truncate">{controls[slot - 1] ?? '—'}</div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className="mt-2 text-xs text-base-600 hover:text-base-400"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      <section className="flex items-center justify-between rounded-xl border border-base-700 bg-base-900/60 px-5 py-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-base-500">Flow Status</div>
          <div className="mt-1.5 text-sm text-base-300">{flowStatus}</div>
        </div>
        <span className="shrink-0 text-xs text-base-500">Settings</span>
      </section>
    </div>
  )
}
