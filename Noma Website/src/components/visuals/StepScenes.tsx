import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import AppIcon from './AppIcon'
import ControlBar from './ControlBar'
import ProductNotice, { type ProductNoticeStep } from './ProductNotice'
import { appProfiles } from '../../data/appProfiles'
import { SAVED_LABEL, ZONES } from '../../data/flowDemo'

/**
 * The four "How it works" steps, each a small looping scene inside a Noma
 * window (2026-10-06, after raisedhand.ai's scroll-played product windows).
 * They tell the same story as the rest of the page, with the same workflow:
 * screenshot in VS Code, paste into Claude, commit in GitHub Desktop; Noma's
 * notice at the app's threshold of three; saving it to a Glide zone; the
 * controls following you, with the saved workflow on VS Code's upper left.
 * Each loops only while mounted; reduced motion shows its finished state.
 */

/** Advances 0..n-1 on a timer, holding on the last for `holdMs`. */
function useTicker(n: number, stepMs: number, holdMs = stepMs) {
  const reduceMotion = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduceMotion) return
    const timer = setTimeout(() => setI((v) => (v + 1) % n), i === n - 1 ? holdMs : stepMs)
    return () => clearTimeout(timer)
  }, [i, n, stepMs, holdMs, reduceMotion])
  return reduceMotion ? n - 1 : i
}

export function StepWindow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-base-900/80 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="relative flex h-9 items-center border-b border-white/[0.06] px-4">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="absolute inset-x-0 text-center text-xs text-base-400">{title}</span>
      </div>
      <div className="relative flex min-h-[300px] items-center justify-center p-6 sm:min-h-[340px] sm:p-8">{children}</div>
    </div>
  )
}

const WORK = [
  { appId: 'vscode', keys: 'Win + Shift + S', label: 'Screenshot' },
  { appId: 'claude', keys: 'Ctrl + V', label: 'Paste' },
  { appId: 'github', keys: 'Ctrl + Enter', label: 'Commit' },
]

/** 01: the app in front changes as you work; the keys you press show up. */
export function WorkScene() {
  const i = useTicker(WORK.length, 1300)
  const step = WORK[i]
  return (
    <div className="w-full max-w-sm">
      <div className="flex justify-center gap-3">
        {WORK.map((w, index) => (
          <div
            key={w.appId}
            className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-500 ${
              index === i ? 'scale-105 border-white/20 bg-white/[0.08]' : 'border-white/[0.06] bg-white/[0.02] opacity-50'
            }`}
          >
            <AppIcon id={w.appId} color={appProfiles[w.appId]?.color} className="h-7 w-7" />
          </div>
        ))}
      </div>
      <div className="mt-8 flex h-10 justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.appId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/50 px-3.5 py-2"
          >
            <span className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 font-mono text-xs text-white">{step.keys}</span>
            <span className="text-sm text-base-300">{step.label}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="mt-6 text-center text-sm text-base-400">{appProfiles[step.appId]?.shortName} is in front</p>
    </div>
  )
}

const NOTICE_STEPS: ProductNoticeStep[] = [
  { kind: 'action', label: 'Screenshot' },
  { kind: 'app', label: 'Claude', appId: 'claude', color: '#d97757', action: 'Paste' },
  { kind: 'app', label: 'GitHub', appId: 'github', color: '#f0f0f0', action: 'Commit' },
]

/** 02: the same three steps, again and again; on the third, the notice. */
export function NoticeScene() {
  // 0..2 = runs one to three, 3 = the notice.
  const i = useTicker(4, 900, 3400)
  const runs = Math.min(i + 1, 3)
  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className={`h-2 w-8 rounded-full transition-colors duration-300 ${dot < runs ? 'bg-note-violet' : 'bg-white/10'}`}
          />
        ))}
        <span className="ml-2 font-mono text-xs text-base-400">{runs}×</span>
      </div>
      <div className="mt-8 flex h-[150px] items-start justify-center">
        <AnimatePresence>
          {i === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <ProductNotice steps={NOTICE_STEPS} occurrences={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** 03: pick the zone that runs it. */
export function ZoneScene() {
  // 0 = asking, 1 = hovering upper left, 2 = saved.
  const i = useTicker(3, 1100, 2600)
  const controls = appProfiles.vscode.controls
  return (
    <div className="w-full max-w-md">
      <p className="text-sm text-base-300">Which Glide zone in Visual Studio Code should run it?</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {ZONES.map((zone, index) => {
          const chosen = index === 0 && i >= 1
          return (
            <div
              key={zone}
              className={`rounded-[10px] border bg-app-800 px-3 py-2.5 text-left shadow-[inset_0_1px_0_0_rgba(255,250,240,0.05)] transition-colors duration-300 ${
                chosen ? 'border-note-violet/60' : 'border-white/[0.07]'
              }`}
            >
              <span className="block text-xs text-base-400">{zone}</span>
              <span className="mt-0.5 block truncate text-sm text-base-100">
                {index === 0 && i === 2 ? SAVED_LABEL : controls[index]}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-5 h-6">
        <AnimatePresence>
          {i === 2 && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-base-200"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ink text-app-950">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              Saved to the upper left zone. Five steps, one swipe.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const MOVE = ['vscode', 'chrome', 'claude']

/** 04: switch apps and the controls follow; your workflow is still there in VS Code. */
export function MoveScene() {
  const i = useTicker(MOVE.length, 1800)
  const appId = MOVE[i]
  const controls = appId === 'vscode' ? [SAVED_LABEL, ...appProfiles.vscode.controls.slice(1)] : undefined
  return (
    <div className="w-full">
      <ControlBar compact appId={appId} controls={controls} highlight={appId === 'vscode' ? 0 : null} />
      <p className="mt-6 text-center text-sm text-base-400">
        {appId === 'vscode' ? 'Back in VS Code, your workflow is one swipe away.' : `In ${appProfiles[appId]?.shortName}, its own four.`}
      </p>
    </div>
  )
}
