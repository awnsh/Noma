import { AnimatePresence, motion } from 'framer-motion'
import KeyboardVisual from '../visuals/KeyboardVisual'
import WindowDots from '../ui/WindowDots'
import AppIcon from '../visuals/AppIcon'
import { usePinnedScroll, stageLocalT } from '../../hooks/usePinnedScroll'
import { appProfiles } from '../../data/appProfiles'

const SCROLL_VH = 3

interface Stage {
  appId: 'vscode' | 'claude' | 'chrome'
  lines: string[]
}

const STAGES: Stage[] = [
  { appId: 'vscode', lines: ['const workflow = detect(app)', 'noma.adapt(workflow)', '// controls update in real time'] },
  { appId: 'claude', lines: ['Paste the error above.', 'Here’s the fix. Try running it again.', 'Got it, thanks.'] },
  { appId: 'chrome', lines: ['github.com/pull/482', 'Review changes · 3 files', 'Approve and merge'] },
]

function Copy() {
  return (
    <div className="max-w-md">
      <h2 className="text-balance font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.1] tracking-tight text-base-950">
        What if your keyboard knew what you were doing?
      </h2>
      <p className="mt-5 max-w-sm text-balance text-base leading-relaxed text-base-500">
        Noma detects the apps you&rsquo;re using, understands your workflow, and adapts in real time.
      </p>
    </div>
  )
}

/** Hoisted to module scope on purpose — `usePinnedScroll` updates state on
 *  essentially every scroll frame while this section is pinned, and a
 *  component *defined inside* another component's render body gets a new
 *  function identity every time that outer component re-renders. React
 *  treats a changed function identity as a completely different component
 *  type, so it was fully unmounting and remounting this entire subtree
 *  (including the live `KeyboardVisual`, tearing down its float animation
 *  and re-triggering `AnimatePresence`) on every single scroll frame — the
 *  exact cause of real reported scroll lag on this section. Defining it
 *  here instead means its identity is stable across every re-render; only
 *  its props change. */
function Desktop({ stage, lines }: { stage: number; lines: string[] }) {
  const profile = appProfiles[STAGES[stage].appId]
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl border border-base-200 bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-2 border-b border-base-200 bg-base-50 px-4 py-3">
          <WindowDots size="h-2 w-2" />
          <span className="ml-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-base-400">
            <AppIcon id={STAGES[stage].appId} color={profile.color} className="h-3 w-3" />
            {profile.shortName}
          </span>
        </div>
        <div className="flex min-h-[168px] flex-col justify-center gap-3 px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-3"
            >
              {lines.map((line, i) => (
                <p key={i} className={`font-mono text-[13px] text-base-600 ${i === 0 ? 'text-base-950' : ''}`}>
                  {line}
                </p>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute -bottom-10 -right-6 w-[62%] sm:-bottom-14 sm:-right-10 sm:w-[58%]">
        <KeyboardVisual
          appName={profile.name}
          controls={profile.controls}
          glow={false}
          float={false}
          showPinConnectors={false}
        />
      </div>
    </div>
  )
}

/**
 * The one bright section on an otherwise dark page (the product brief's
 * own "editorial light section for contrast," same convention the old
 * `AdaptiveIntelligence.tsx` used) — a real desktop window, not a second
 * dashboard mockup: a plain light window (VS Code, Claude, then a browser
 * tab, one per pinned scroll stage) with the actual dark Noma keyboard
 * sitting below it, relabeling to match. The realism is deliberately
 * modest — a few lines of representative content, not a pixel-accurate
 * editor clone — since the point is "a believable desktop," not a second
 * flagship product demo.
 */
export default function EditorialContrast() {
  const { reduceMotion, wrapRef, panelRef, contentRef, phase, progress, contentScale, panelPositionClass } = usePinnedScroll({ scrollVh: SCROLL_VH })
  const last = STAGES.length - 1

  if (reduceMotion) {
    return (
      <section id="how-it-knows" className="relative bg-base-50 py-24 sm:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-20 px-6 sm:px-8 lg:grid-cols-2">
          <Copy />
          <div className="pb-12 pr-6 sm:pb-16">
            <Desktop stage={last} lines={STAGES[last].lines} />
          </div>
        </div>
      </section>
    )
  }

  const stage = Math.min(last, Math.floor(progress * STAGES.length))
  const t = stageLocalT(progress, stage / STAGES.length, (stage + 1) / STAGES.length)

  return (
    <div ref={wrapRef} id="how-it-knows" style={{ height: `${SCROLL_VH * 100}vh` }} className="relative bg-base-50">
      <div ref={panelRef} className={`${panelPositionClass} flex items-center justify-center`}>
        <div
          ref={contentRef}
          className="mx-auto grid w-full max-w-6xl items-center gap-16 px-6 sm:px-8 lg:grid-cols-2 lg:gap-20"
          style={{ transform: `scale(${contentScale})`, transformOrigin: '50% 50%' }}
        >
          <Copy />
          <div className="pb-12 pr-6 sm:pb-16">
            <Desktop stage={stage} lines={STAGES[stage].lines} />
          </div>
        </div>
      </div>
      <p
        className="pointer-events-none absolute inset-x-0 bottom-8 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-base-400 transition-opacity duration-300"
        style={{ opacity: phase === 'pinned' && (stage < last || t < 0.7) ? 1 : 0 }}
      >
        Keep scrolling
      </p>
    </div>
  )
}
