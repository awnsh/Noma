import { AnimatePresence, motion } from 'framer-motion'
import KeyboardVisual from '../visuals/KeyboardVisual'
import DemoWorkflowChain, { type DemoChainStep } from '../visuals/DemoWorkflowChain'
import { usePinnedScroll } from '../../hooks/usePinnedScroll'

const SCROLL_VH = 4.2

// The exact chain named in the product brief — real actions, not an
// invented example: screenshot the problem, hand it to Claude, paste the
// fix back, run it, ship it. `DemoWorkflowChain` already knows how to fade
// each node in with a stagger (see that file), so revealing the chain one
// step at a time is just handing it a growing slice of this array per
// scroll stage — no separate reveal mechanism needed.
const CHAIN: DemoChainStep[] = [
  { kind: 'shortcut', label: 'Screenshot' },
  { kind: 'app', appId: 'claude', label: 'Claude' },
  { kind: 'shortcut', label: 'Paste' },
  { kind: 'shortcut', label: 'Run' },
  { kind: 'app', appId: 'github', label: 'GitHub' },
]

// One caption per reveal stage, then a closing "recognized" stage once the
// full chain is visible — six beats total for five steps.
const CAPTIONS = [
  'Screenshot the problem.',
  'Hand it to Claude.',
  'Paste the fix back.',
  'Run it.',
  'Ship it.',
  'Do that a few times, and Noma remembers.',
]

const LEARNED_CONTROLS = ['Screenshot', 'Paste', 'Run', 'Commit']

const STAGE_BOUNDS = CAPTIONS.map((_, i) => i / CAPTIONS.length).concat(1.001)

function stageFromProgress(p: number) {
  for (let i = 0; i < STAGE_BOUNDS.length - 1; i++) {
    if (p < STAGE_BOUNDS[i + 1]) return i
  }
  return STAGE_BOUNDS.length - 2
}

/**
 * "You show it once. Noma remembers." — the site's second flagship
 * pinned-scroll sequence (after `AppAwareness`), and the one the product
 * brief explicitly calls out as deserving the strongest animation on the
 * page. Five real steps reveal in order as the visitor scrolls, each one
 * landing as its own beat rather than the whole chain appearing at once;
 * once the full chain is visible, one more beat states the actual claim
 * ("Noma remembers") and the keyboard below updates to show the chain
 * turned into four real controls — the payoff a visitor can't get from
 * reading a sentence about "workflow learning."
 */
export default function WorkflowLearning() {
  const { reduceMotion, wrapRef, panelRef, contentRef, phase, progress, contentScale, panelPositionClass } = usePinnedScroll({ scrollVh: SCROLL_VH })
  const last = CAPTIONS.length - 1

  if (reduceMotion) {
    return (
      <section id="learns" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center sm:px-8">
          <p className="font-display text-3xl font-semibold text-base-50 sm:text-5xl">{CAPTIONS[last]}</p>
          <div className="mt-10 flex justify-center">
            <DemoWorkflowChain steps={CHAIN} size="lg" />
          </div>
          <div className="relative mx-auto mt-14 w-full max-w-3xl">
            <KeyboardVisual appName="Noma" controls={LEARNED_CONTROLS} emphasizedLabels={LEARNED_CONTROLS} glow={false} float={false} showPinConnectors={false} />
          </div>
        </div>
      </section>
    )
  }

  const stage = stageFromProgress(progress)
  const revealCount = Math.min(CHAIN.length, stage + 1)
  const learned = stage >= last

  return (
    <div ref={wrapRef} id="learns" style={{ height: `${SCROLL_VH * 100}vh` }} className="relative border-t border-base-800 bg-base-950">
      <div ref={panelRef} className={`${panelPositionClass} flex flex-col items-center justify-start pt-28 pb-10 sm:pt-32`}>
        <div
          ref={contentRef}
          className="mx-auto w-full max-w-4xl px-6 text-center sm:px-8"
          style={{ transform: `scale(${contentScale})`, transformOrigin: '50% 0%' }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-flow">Workflow learning</p>

          <div className="mt-4 flex h-[76px] items-center justify-center sm:h-[92px]">
            <AnimatePresence mode="wait">
              <motion.p
                key={stage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-balance font-display text-2xl font-semibold text-base-50 sm:text-4xl"
              >
                {CAPTIONS[stage]}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="mt-10 flex min-h-[132px] items-start justify-center" aria-hidden="true">
            <DemoWorkflowChain steps={CHAIN.slice(0, revealCount)} size="lg" />
          </div>

          <div className="relative mx-auto mt-6 w-full max-w-3xl" aria-hidden="true">
            <AnimatePresence mode="wait">
              <motion.div
                key={learned ? 'learned' : 'idle'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <KeyboardVisual
                  appName="Noma"
                  controls={learned ? LEARNED_CONTROLS : []}
                  emphasizedLabels={learned ? LEARNED_CONTROLS : undefined}
                  glow={false}
                  float={false}
                  showPinConnectors={false}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <p
            className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-base-500 transition-opacity duration-300"
            style={{ opacity: phase === 'pinned' && stage < last ? 1 : 0 }}
          >
            Keep scrolling
          </p>
        </div>

        <p className="sr-only">
          Illustration: Noma watches a repeated sequence &mdash; screenshot, switch to Claude, paste the fix, run it,
          push to GitHub &mdash; and after a few repeats turns the whole sequence into four controls on the physical
          keyboard.
        </p>
      </div>
    </div>
  )
}
