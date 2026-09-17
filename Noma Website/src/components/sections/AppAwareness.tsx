import { AnimatePresence, motion } from 'framer-motion'
import KeyboardVisual from '../visuals/KeyboardVisual'
import AppIcon from '../visuals/AppIcon'
import { usePinnedScroll, stageLocalT } from '../../hooks/usePinnedScroll'
import { appProfiles } from '../../data/appProfiles'

const SCROLL_VH = 3.6

interface Stage {
  appId: string
  caption: string
  controls: string[]
}

// Deliberately different control words than appProfiles' own generic sets
// for these four apps (reused as-is in Section 7 further down) — this
// section's whole point is "the same board, four completely different
// labels," and the four contexts each get their own literal, specific
// verbs rather than pulling from one shared registry every section reuses
// the same way.
const STAGES: Stage[] = [
  { appId: 'vscode', caption: 'Coding in VS Code.', controls: ['Run', 'Terminal', 'Commit', 'Screenshot'] },
  { appId: 'claude', caption: 'Switch to Claude.', controls: ['Screenshot', 'Prompt', 'Paste', 'Run'] },
  { appId: 'chrome', caption: 'Open a browser tab.', controls: ['Back', 'New Tab', 'Search', 'Save'] },
  { appId: 'github', caption: 'Ship it on GitHub.', controls: ['Commit', 'Pull', 'Issues', 'Open'] },
]

const STAGE_BOUNDS = STAGES.map((_, i) => i / STAGES.length).concat(1.001)

function stageFromProgress(p: number) {
  for (let i = 0; i < STAGE_BOUNDS.length - 1; i++) {
    if (p < STAGE_BOUNDS[i + 1]) return i
  }
  return STAGE_BOUNDS.length - 2
}

/** The horizontal app sequence — four real, large marks, not a decorative
 *  row of tiny icons. The active one is the only one at full size/opacity;
 *  the rest recede but stay legible, so the whole sequence reads as one
 *  continuous strip the visitor is moving along, not four unrelated
 *  logos. */
function AppSequence({ stage }: { stage: number }) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      {STAGES.map((s, i) => {
        const profile = appProfiles[s.appId]
        const active = i === stage
        return (
          <div key={s.appId} className="flex items-center gap-3 sm:gap-5">
            <motion.div
              animate={{ opacity: active ? 1 : 0.32, scale: active ? 1 : 0.82 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-base-700 bg-base-900 sm:h-16 sm:w-16"
              style={{ borderColor: active ? `${profile.color}55` : undefined }}
            >
              <AppIcon id={s.appId} color={profile.color} className="h-7 w-7 sm:h-8 sm:w-8" />
            </motion.div>
            {i < STAGES.length - 1 && <span aria-hidden className="h-px w-4 bg-base-700 sm:w-8" />}
          </div>
        )
      })}
    </div>
  )
}

/**
 * "Your keyboard knows where you are." — the second beat of the site's
 * opening argument, right after Hero establishes what Noma is. Four real
 * applications, one board: as the visitor scrolls, the active app in the
 * sequence above changes and the exact same physical keyboard relabels
 * itself for it. No dashboard, no code-editor mockup — the app icons and
 * the keyboard are the only UI, same restraint as the flagship demo
 * further down this page (`WorkflowLearning.tsx`, the old `ProductDemo`).
 */
export default function AppAwareness() {
  const { reduceMotion, wrapRef, panelRef, contentRef, phase, progress, contentScale, panelPositionClass } = usePinnedScroll({ scrollVh: SCROLL_VH })
  const last = STAGES.length - 1

  if (reduceMotion) {
    return (
      <section id="product" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center sm:px-8">
          <p className="font-display text-3xl font-semibold text-base-50 sm:text-5xl">Your keyboard knows where you are.</p>
          <div className="mt-10">
            <AppSequence stage={last} />
          </div>
          <div className="relative mx-auto mt-10 w-full max-w-3xl">
            <KeyboardVisual appName={appProfiles[STAGES[last].appId].name} controls={STAGES[last].controls} glow={false} float={false} showPinConnectors={false} />
          </div>
        </div>
      </section>
    )
  }

  const stage = stageFromProgress(progress)
  const scene = STAGES[stage]
  const t = stageLocalT(progress, STAGE_BOUNDS[stage], STAGE_BOUNDS[stage + 1])

  return (
    <div ref={wrapRef} id="product" style={{ height: `${SCROLL_VH * 100}vh` }} className="relative border-t border-base-800 bg-base-950">
      <div ref={panelRef} className={`${panelPositionClass} flex flex-col items-center justify-start pt-28 pb-10 sm:pt-32`}>
        <div
          ref={contentRef}
          className="mx-auto w-full max-w-4xl px-6 text-center sm:px-8"
          style={{ transform: `scale(${contentScale})`, transformOrigin: '50% 0%' }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-base-500">Context awareness</p>

          <div className="mt-4 flex h-[68px] items-center justify-center sm:h-[84px]">
            <AnimatePresence mode="wait">
              <motion.p
                key={stage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-balance font-display text-2xl font-semibold text-base-50 sm:text-4xl"
              >
                {scene.caption}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="mt-8" aria-hidden="true">
            <AppSequence stage={stage} />
          </div>

          <div className="relative mx-auto mt-10 w-full max-w-3xl" aria-hidden="true">
            <KeyboardVisual appName={appProfiles[scene.appId].name} controls={scene.controls} glow={false} float={false} showPinConnectors={false} />
          </div>

          <p
            className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-base-500 transition-opacity duration-300"
            style={{ opacity: phase === 'pinned' && (stage < last || t < 0.7) ? 1 : 0 }}
          >
            Keep scrolling
          </p>
        </div>

        <p className="sr-only">
          Illustration: the same physical Noma keyboard relabels its controls as the visitor moves between VS Code
          (Run, Terminal, Commit, Screenshot), Claude (Screenshot, Prompt, Paste, Run), a browser (Back, New Tab,
          Search, Save), and GitHub (Commit, Pull, Issues, Open): one keyboard, controls that follow the app in
          focus.
        </p>
      </div>
    </div>
  )
}
