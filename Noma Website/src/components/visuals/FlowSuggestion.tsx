import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DemoWorkflowSteps, type DemoChainStep } from './DemoWorkflowChain'
import { DEMO_BUTTON_PRIMARY, DEMO_BUTTON_QUIET, DEMO_HERO_CARD } from './demoSurfaces'
import { appProfiles } from '../../data/appProfiles'
import { SAVED_LABEL, ZONES } from '../../data/flowDemo'

/**
 * The suggestion Flow puts on Noma's Home page, clickable. Copy and order
 * follow Noma App's NomaMoment.tsx exactly (2026-10-06): "Noma noticed", the
 * occurrence sentence, the chain, "Turn this into one Glide action?",
 * Review steps → the exact steps in order → which zone → saved. Driven by
 * local state here; the real one is driven by the app's suggestion engine.
 * The workflow is the same one WorkflowDemo plays, so the page tells one
 * story: noticed while you work, decided here.
 */

const APP = 'Chrome'
const OCCURRENCES = 9

const CHAIN: DemoChainStep[] = [
  { kind: 'app', appId: 'chrome', label: 'Chrome' },
  { kind: 'shortcut', label: 'Screenshot', keys: 'Win+Shift+S' },
  { kind: 'app', appId: 'discord', label: 'Discord' },
  { kind: 'shortcut', label: 'Paste', keys: 'Ctrl+V' },
  { kind: 'app', appId: 'notion', label: 'Notion' },
  { kind: 'shortcut', label: 'Paste', keys: 'Ctrl+V' },
]

/** What the app's preview lists under "Exactly what this will do". */
const PREVIEW = [
  'Press Win + Shift + S in Chrome',
  'Switch to Discord',
  'Press Ctrl + V',
  'Switch to Notion',
  'Press Ctrl + V',
]

type Stage = 'ask' | 'review' | 'saved' | 'dismissed'

export default function FlowSuggestion({ onSaved }: { onSaved: (slot: number | null) => void }) {
  const [stage, setStage] = useState<Stage>('ask')
  const [slot, setSlot] = useState<number | null>(null)
  const controls = appProfiles.chrome.controls

  const save = (index: number) => {
    setSlot(index)
    setStage('saved')
    onSaved(index)
  }
  const reset = () => {
    setSlot(null)
    setStage('ask')
    onSaved(null)
  }

  const fade = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  }

  return (
    <div className={`${DEMO_HERO_CARD} p-5 sm:p-6`}>
      <AnimatePresence mode="wait" initial={false}>
        {stage === 'saved' && slot !== null ? (
          <motion.div key="saved" {...fade}>
            <p className="text-xs text-base-400">Saved</p>
            <p className="mt-1.5 text-lg font-semibold text-base-50">{SAVED_LABEL}</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-base-300">
              Now on the {ZONES[slot].toLowerCase()} Glide zone in {APP}. To run it, switch to {APP} and swipe in
              from the {ZONES[slot].toLowerCase()}.
            </p>
            <button type="button" onClick={reset} className="mt-5 text-xs text-base-400 transition-colors hover:text-base-100">
              Start over
            </button>
          </motion.div>
        ) : stage === 'dismissed' ? (
          <motion.div key="dismissed" {...fade}>
            <p className="text-sm text-base-300">Not now. Noma learns from that too.</p>
            <button type="button" onClick={reset} className="mt-4 text-xs text-base-100 underline decoration-white/20 underline-offset-[3px] transition-colors hover:text-white">
              Show it again
            </button>
          </motion.div>
        ) : (
          <motion.div key="ask" {...fade}>
            <p className="text-base font-semibold leading-snug text-base-50 sm:text-[17px]">
              You&rsquo;ve repeated this workflow {OCCURRENCES} times across your apps.
            </p>
            <p className="mt-2 flex items-center gap-2 text-[13px] text-base-400">
              <span>Flow noticed this</span>
              <span aria-hidden className="text-base-500">&middot;</span>
              Just now
            </p>
            <div className="mt-4">
              <DemoWorkflowSteps steps={CHAIN} />
            </div>

            {stage === 'ask' ? (
              <>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/[0.06] pt-4">
                  <p className="text-sm text-base-100">Turn this into one Glide action?</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setStage('review')} className={DEMO_BUTTON_PRIMARY}>
                      Review steps
                    </button>
                    <button type="button" onClick={() => setStage('dismissed')} className={DEMO_BUTTON_QUIET}>
                      Not now
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-6 border-t border-white/[0.06] pt-5">
                <p className="mb-2 text-xs text-base-400">Exactly what this will do, in order:</p>
                <ol className="space-y-1 text-sm">
                  {PREVIEW.map((step, index) => (
                    <li key={index} className="flex gap-2.5">
                      <span className="w-4 shrink-0 text-right text-[11px] leading-5 tabular-nums text-base-500">{index + 1}</span>
                      <span className="text-base-100">{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-base-500">
                  It only runs when you swipe its zone, and stops at the first step that fails.
                </p>
                <p className="mb-2 mt-5 text-xs text-base-400">
                  Which Glide zone in {APP} should run it? It replaces what&rsquo;s there now.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ZONES.map((zone, index) => (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => save(index)}
                      className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-2.5 text-left text-xs transition-colors hover:border-white/25"
                    >
                      <span className="block text-[11px] text-base-400">{zone}</span>
                      <span className="mt-0.5 block truncate text-base-100">{controls[index]}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setStage('ask')} className="mt-3 text-xs text-base-400 hover:text-base-100">
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
