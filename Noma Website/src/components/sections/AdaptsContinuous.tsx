import { AnimatePresence, motion } from 'framer-motion'
import KeyboardVisual from '../visuals/KeyboardVisual'
import AppIcon from '../visuals/AppIcon'
import Reveal from '../ui/Reveal'
import { usePinnedScroll, stageLocalT } from '../../hooks/usePinnedScroll'
import { appProfiles } from '../../data/appProfiles'

const SCROLL_VH = 3.4

interface Context {
  label: string
  appIds: string[]
}

// The exact three groupings named in the product brief. Each context's
// keyboard shows its first app's own real control set (already defined in
// appProfiles.ts, not a new set invented for this section) — the point is
// "the same board, three different worlds," not nine more sub-transitions.
const CONTEXTS: Context[] = [
  { label: 'Coding.', appIds: ['vscode', 'claude', 'github'] },
  { label: 'Design.', appIds: ['figma', 'photoshop', 'chrome'] },
  { label: 'Editing.', appIds: ['premiere', 'aftereffects', 'youtube'] },
]

const STAGE_BOUNDS = CONTEXTS.map((_, i) => i / CONTEXTS.length).concat(1.001)

function stageFromProgress(p: number) {
  for (let i = 0; i < STAGE_BOUNDS.length - 1; i++) {
    if (p < STAGE_BOUNDS[i + 1]) return i
  }
  return STAGE_BOUNDS.length - 2
}

function ContextApps({ appIds }: { appIds: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {appIds.map((id, i) => {
        const profile = appProfiles[id]
        return (
          <div key={id} className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-base-700 bg-base-900"
              style={{ borderColor: i === 0 ? `${profile.color}55` : undefined }}
            >
              <AppIcon id={id} color={profile.color} className="h-4.5 w-4.5" />
            </span>
            {i < appIds.length - 1 && <span aria-hidden className="text-base-600">/</span>}
          </div>
        )
      })}
    </div>
  )
}

/**
 * "Your workflow isn't static. Neither is Noma." — one continuous
 * pinned-scroll experience across three real contexts, deliberately not
 * three separate SaaS-style feature cards (the product brief's own
 * instruction). Coding, design, and editing each get the same treatment:
 * a small row naming the real applications that context spans, and the
 * exact same physical keyboard relabeled with the first app's own real
 * controls (`appProfiles.ts` — not a fresh set invented for this section,
 * so it stays consistent with how those apps are described everywhere
 * else on the site).
 */
export default function AdaptsContinuous() {
  const { reduceMotion, wrapRef, panelRef, contentRef, phase, progress, contentScale, panelPositionClass } = usePinnedScroll({ scrollVh: SCROLL_VH })
  const last = CONTEXTS.length - 1

  const Heading = (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <p className="text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
        Your workflow isn&rsquo;t static.
      </p>
      <p className="mt-1 text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-400">
        Neither is Noma.
      </p>
    </Reveal>
  )

  if (reduceMotion) {
    const ctx = CONTEXTS[last]
    const featured = appProfiles[ctx.appIds[0]]
    return (
      <section id="adapts" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-6 sm:px-8">
          {Heading}
          <div className="text-center">
            <p className="font-display text-2xl font-semibold text-base-50">{ctx.label}</p>
            <div className="mt-5">
              <ContextApps appIds={ctx.appIds} />
            </div>
            <div className="relative mx-auto mt-10 w-full max-w-3xl">
              <KeyboardVisual appName={featured.name} controls={featured.controls} glow={false} float={false} showPinConnectors={false} />
            </div>
          </div>
        </div>
      </section>
    )
  }

  const stage = stageFromProgress(progress)
  const ctx = CONTEXTS[stage]
  const featured = appProfiles[ctx.appIds[0]]
  const t = stageLocalT(progress, STAGE_BOUNDS[stage], STAGE_BOUNDS[stage + 1])

  return (
    <div ref={wrapRef} id="adapts" style={{ height: `${SCROLL_VH * 100}vh` }} className="relative border-t border-base-800 bg-base-950">
      <div ref={panelRef} className={`${panelPositionClass} flex flex-col items-center justify-start pt-28 pb-10 sm:pt-32`}>
        <div
          ref={contentRef}
          className="mx-auto w-full max-w-4xl px-6 sm:px-8"
          style={{ transform: `scale(${contentScale})`, transformOrigin: '50% 0%' }}
        >
          {Heading}

          <div className="text-center">
            <div className="flex h-10 items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={stage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="font-display text-2xl font-semibold text-base-50"
                >
                  {ctx.label}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="mt-5" aria-hidden="true">
              <ContextApps appIds={ctx.appIds} />
            </div>

            <div className="relative mx-auto mt-10 w-full max-w-3xl" aria-hidden="true">
              <KeyboardVisual appName={featured.name} controls={featured.controls} glow={false} float={false} showPinConnectors={false} />
            </div>

            <p
              className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-base-500 transition-opacity duration-300"
              style={{ opacity: phase === 'pinned' && (stage < last || t < 0.7) ? 1 : 0 }}
            >
              Keep scrolling
            </p>
          </div>
        </div>

        <p className="sr-only">
          Illustration: the same Noma keyboard relabels for coding (VS Code, Claude, GitHub), design (Figma,
          Photoshop, a browser), and video editing (Premiere, After Effects, YouTube) as the visitor scrolls.
        </p>
      </div>
    </div>
  )
}
