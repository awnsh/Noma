import { AnimatePresence, motion } from 'framer-motion'
import AppControlTile from '../visuals/AppControlTile'
import { usePinnedScroll, stageLocalT } from '../../hooks/usePinnedScroll'
import { controlKeys, formatShortcutCaption } from '../../data/controlActions'

const SCROLL_VH = 3
const STAGE_BOUNDS = [0, 1 / 5, 2 / 5, 3 / 5, 4 / 5, 1.001]

const BASE_CONTROLS = ['Run', 'Debug', 'Terminal', 'Search']
const ADAPTED_CONTROLS = ['Run', 'Debug', 'Terminal', 'Command Palette']

// The same pattern DashboardDemo's own (click-driven) suggestion card uses —
// deliberately the identical story, not a new one, so a visitor who tried
// the real software tab above recognizes it here rather than learning a
// second unrelated example.
const SUGGESTION = {
  title: 'Add Command Palette to your controls',
  explanation: "You've opened Command Palette right before Git Commit 27 times this week.",
  confidence: 92,
}

const CAPTIONS = [
  'You keep doing this.',
  'Flow notices the pattern.',
  'It suggests adding a control.',
  'You accept it.',
  'Now it’s part of your keyboard.',
]

function stageFromProgress(p: number) {
  for (let i = 0; i < STAGE_BOUNDS.length - 1; i++) {
    if (p < STAGE_BOUNDS[i + 1]) return i
  }
  return STAGE_BOUNDS.length - 2
}

const WRAP_CLASS = 'relative mx-auto w-full max-w-4xl px-6 sm:px-8'

/**
 * The site's proof that Noma learns, not just adapts per app — deliberately
 * built to look nothing like ProductDemo.tsx or the flagship demo above it,
 * per real feedback that an earlier version of this section (a keyboard
 * illustration + a big centered caption, functionally the same recipe as
 * the flagship demo) read as a repeated section rather than a different
 * one. The differences here are structural, not decorative: the subject is
 * a realistic Noma *software* window (reusing `AppControlTile`, the real
 * Dashboard's own component, and the exact suggestion story DashboardDemo's
 * interactive tab already tells) instead of the keyboard SVG; the caption
 * is a small left-aligned line above the window instead of a huge centered
 * display-font statement; and the story is "the same app noticing a
 * repeated in-app action," not "different apps, different controls" —
 * ProductDemo's job, not this section's.
 *
 * Still pinned via the shared `usePinnedScroll` hook — scroll-scrubbed
 * software state is exactly spacefs.com's own technique (a real app window
 * whose content advances as you scroll), so reusing the site's pin
 * mechanism here isn't the part that read as repetitive; the keyboard-and-
 * headline visual recipe was.
 */
export default function AdaptiveIntelligence() {
  const { reduceMotion, wrapRef, panelRef, contentRef, phase, progress, contentScale, panelPositionClass } = usePinnedScroll({ scrollVh: SCROLL_VH })

  if (reduceMotion) {
    return (
      <section id="adaptive" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
        <div className={WRAP_CLASS}>
          <p className="text-xl font-medium text-base-100 sm:text-2xl">{CAPTIONS[4]}</p>
          <div className="mt-6">
            <Window
              controls={ADAPTED_CONTROLS}
              justAddedSlot={4}
              showCounter={false}
              showSuggestion={false}
              accepted
              count={27}
              flowStatus="Flow is noticing patterns."
            />
          </div>
        </div>
      </section>
    )
  }

  const stage = stageFromProgress(progress)
  const count = Math.round(stageLocalT(progress, STAGE_BOUNDS[1], STAGE_BOUNDS[2]) * 27)
  const controls = stage >= 4 ? ADAPTED_CONTROLS : BASE_CONTROLS
  const showCounter = stage >= 1 && stage < 4
  const showSuggestion = stage >= 2 && stage < 4
  const accepted = stage >= 3
  const flowStatus = stage === 0 ? "Flow isn't noticing anything yet." : stage < 4 ? 'Flow noticed something — see below.' : 'Flow is noticing patterns.'

  return (
    <div ref={wrapRef} id="adaptive" className="relative border-t border-base-800 bg-base-950" style={{ height: `${SCROLL_VH * 100}vh` }}>
      <div ref={panelRef} className={`${panelPositionClass} flex flex-col items-center justify-start pt-28 pb-10 sm:pt-32`}>
        <div
          ref={contentRef}
          className={WRAP_CLASS}
          style={{ transform: `scale(${contentScale})`, transformOrigin: '50% 0%' }}
          aria-hidden="true"
        >
          <div className="mb-5 flex h-[64px] items-center sm:h-[52px]">
            <AnimatePresence mode="wait">
              <motion.p
                key={stage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-xl font-medium text-base-100 sm:text-2xl"
              >
                {CAPTIONS[stage]}
              </motion.p>
            </AnimatePresence>
          </div>

          <Window
            controls={controls}
            justAddedSlot={stage >= 4 ? 4 : null}
            showCounter={showCounter}
            showSuggestion={showSuggestion}
            accepted={accepted}
            count={count}
            flowStatus={flowStatus}
          />

          <p
            className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-base-500 transition-opacity duration-300"
            style={{ opacity: phase === 'pinned' && stage < 4 ? 1 : 0 }}
          >
            Keep scrolling
          </p>
        </div>

        <p className="sr-only">
          Illustration: the Noma dashboard notices you've opened Command Palette right before Git Commit 27 times
          this week, suggests adding Command Palette to your controls, and — once accepted — the control appears
          among your keyboard's current controls, replacing Search.
        </p>
      </div>
    </div>
  )
}

function Window({
  controls,
  justAddedSlot,
  showCounter,
  showSuggestion,
  accepted,
  count,
  flowStatus,
}: {
  controls: string[]
  justAddedSlot: number | null
  showCounter: boolean
  showSuggestion: boolean
  accepted: boolean
  count: number
  flowStatus: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-base-700 bg-base-850/60 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-base-700 bg-base-900/60 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-base-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-base-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-base-600" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-base-500">Noma — Dashboard</span>
      </div>

      <div className="p-6 sm:p-8">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-base-500">Current Application</div>
          <div className="mt-1.5 text-2xl font-semibold text-base-100">Visual Studio Code</div>
        </div>

        <div className="mt-6">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-base-500">Current Controls</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((slot) => {
              const label = controls[slot - 1]
              const keys = controlKeys[label]
              return (
                <div key={slot} className="relative">
                  <AppControlTile slot={slot} label={label} caption={keys && formatShortcutCaption(keys)} />
                  {justAddedSlot === slot && (
                    <span className="absolute -right-1.5 -top-1.5 rounded-full bg-flow px-1.5 py-0.5 text-[9px] font-medium text-base-950">Added</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 flex h-5 items-center gap-2 font-mono text-xs text-base-500">
          {showCounter && (
            <>
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-flow" />
              Command Palette → Git Commit: {count}&times; this week
            </>
          )}
        </div>

        <AnimatePresence>
          {showSuggestion && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 rounded-xl border border-flow/30 bg-flow/[0.05] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-base-100">{SUGGESTION.title}</div>
                  <p className="mt-1 text-sm text-base-400">{SUGGESTION.explanation}</p>
                </div>
                <div className="shrink-0 rounded-full border border-base-600 px-2 py-0.5 text-[10px] uppercase tracking-widest text-base-500">
                  {SUGGESTION.confidence}%
                </div>
              </div>

              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-flow-dim bg-flow/10 px-3 py-1 text-xs font-medium text-flow">
                  {accepted ? '✓ Accepted' : 'Accept'}
                </span>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-base-700 bg-base-900/60 px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-base-500">Flow Status</div>
            <div className="mt-1.5 text-sm text-base-300">{flowStatus}</div>
          </div>
          <span className="shrink-0 text-xs text-base-500">Settings</span>
        </div>
      </div>
    </div>
  )
}
