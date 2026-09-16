// A faithful interactive recreation of the real app's Home page
// (src/renderer/src/pages/Home.tsx), driven by local state instead of the
// real app's window.flow IPC bridge (which only exists inside Electron; see
// AppPreview.tsx's doc comment). Switching applications here is standing in
// for what happens automatically when Windows reports a new foreground app.
//
// The suggestion card is a simplified port of the real app's `NomaMoment`
// component (src/renderer/src/components), `variant="hero"` — same shape
// (a hero glass card with a signature-blue left edge, the occurrence
// sentence, a `WorkflowChain`, then "Turn this into one action?" with a
// gradient Create-action button), updated 2026-09-16 alongside the real
// app's liquid-glass visual system. Not attempting the real component's
// full "More / Why Noma suggested this" disclosure — this demo keeps the
// primary two-choice moment and drops the optional explain affordance to
// stay legible at the size a marketing page can give it.

import { useState } from 'react'
import AppControlTile from './AppControlTile'
import DemoWorkflowChain, { type DemoChainStep } from './DemoWorkflowChain'
import { appProfiles } from '../../data/appProfiles'
import { controlKeys, formatShortcutCaption } from '../../data/controlActions'
import { DEMO_HERO_CARD } from './demoSurfaces'

const apps = [appProfiles.vscode, appProfiles.premiere, appProfiles.solidworks, appProfiles.chrome]

const flowStatusByApp: Record<string, string> = {
  premiere: 'Flow is learning your workflow.',
  solidworks: 'Flow is learning your workflow.',
  chrome: "Flow isn't learning yet.",
}

// The one seeded suggestion — mirrors the same "Command Palette before Git
// Commit, 27 times this week" pattern the rest of the site references, so
// every tab tells the same, consistent Flow story rather than unrelated ones.
const OCCURRENCE_COUNT = 27
const CHAIN: DemoChainStep[] = [
  { kind: 'app', appId: 'vscode', label: 'VS Code' },
  { kind: 'shortcut', label: 'Command Palette' },
  { kind: 'shortcut', label: 'Git Commit' },
]

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

      {/* The Noma Moment — a hero glass card with a signature-blue left edge,
          outranking everything else on the page, exactly as it does on the
          real app's Home. */}
      {showSuggestion && (
        <section className={`relative mb-8 p-6 ${DEMO_HERO_CARD}`}>
          <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-accent" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-base-500">Noma noticed</p>
          <p className="mt-2 font-display text-xl font-semibold leading-snug text-base-100 sm:text-2xl">
            You&rsquo;ve repeated this workflow {OCCURRENCE_COUNT} times in Visual Studio Code.
          </p>

          <div className="mt-5">
            <DemoWorkflowChain steps={CHAIN} size="lg" />
          </div>

          {status === 'pending' ? (
            <>
              <p className="mt-6 text-base text-base-100">Turn this into one action?</p>
              <div className="mt-3 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setStatus('picking')}
                  className="rounded-md bg-gradient-to-b from-accent-bright to-accent px-4 py-2 text-sm font-medium text-base-950 shadow-[0_4px_16px_-4px_rgba(76,126,255,0.55)] transition-shadow duration-150 hover:shadow-[0_6px_20px_-4px_rgba(76,126,255,0.7)] active:opacity-90"
                >
                  Create action
                </button>
                <button type="button" onClick={() => setStatus('resolved')} className="text-sm text-base-500 hover:text-base-100">
                  Not now
                </button>
              </div>
            </>
          ) : (
            <div className="mt-5 border-t border-base-700 pt-4">
              <p className="mb-2 text-xs text-base-500">Which control should this replace? You choose — Noma never picks for you.</p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => accept(slot)}
                    className="rounded-md border border-base-700 px-2 py-2 text-center text-xs text-base-400 transition-colors hover:border-accent hover:text-base-100"
                  >
                    <div className="text-[10px] text-base-600">{slot}</div>
                    <div className="mt-0.5 truncate text-base-100">{controls[slot - 1] ?? '—'}</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setStatus('pending')} className="mt-3 text-xs text-base-500 hover:text-base-100">
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      <section className="mb-8">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-base-500">Current Controls</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((slot) => {
            const label = controls[slot - 1]
            const keys = label ? controlKeys[label] : undefined
            return (
              <div key={slot} className="relative">
                <AppControlTile slot={slot} label={label} caption={keys && formatShortcutCaption(keys)} appId={active.id} appName={active.name} />
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
